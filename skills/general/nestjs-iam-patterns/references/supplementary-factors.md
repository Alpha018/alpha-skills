# Supplementary authentication factors

Google Sign-In and TOTP/2FA are not standalone authentication patterns: they layer onto one of the primary mechanisms (usually JWT). Read the relevant primary pattern reference first.

## Google Sign-In

The backend verifies a Google ID token the client obtained from Google, then issues the app's own tokens exactly as a normal sign-in would.

```bash
npm i google-auth-library
```

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

```ts
@Injectable()
export class GoogleAuthenticationService implements OnModuleInit {
  private oauthClient: OAuth2Client;
  private clientId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  onModuleInit() {
    this.clientId = this.configService.getOrThrow('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.getOrThrow('GOOGLE_CLIENT_SECRET');
    this.oauthClient = new OAuth2Client(this.clientId, clientSecret);
  }

  async authenticate(token: string) {
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken: token,
        audience: this.clientId, // must be checked explicitly
      });

      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        throw new UnauthorizedException();
      }

      const googleId = payload.sub;
      let user = await this.userRepository.findOneBy({ googleId });

      if (!user) {
        user = await this.userRepository.save({ email: payload.email, googleId });
      }

      return this.authService.generateTokens(user);
    } catch (error) {
      if (error?.code === '23505') {
        throw new ConflictException('Account conflict');
      }
      throw new UnauthorizedException();
    }
  }
}
```

```ts
@Auth(AuthMethod.None)
@Controller('authentication/google')
export class GoogleAuthenticationController {
  constructor(private readonly googleAuthService: GoogleAuthenticationService) {}

  @Post()
  authenticate(@Body() dto: GoogleTokenDto) {
    return this.googleAuthService.authenticate(dto.token);
  }
}
```

### Supporting both local and Google login on the same user

```ts
@Column({ nullable: true })
password: string | null;

@Column({ nullable: true, unique: true })
googleId: string | null;
```

Local sign-in must check for a password before comparing against it, since a Google-only account has none:

```ts
if (!user?.password) {
  throw new UnauthorizedException('Invalid credentials');
}
```

## TOTP / 2FA

Adds a second factor, verified with `otplib` against authenticator apps.

```bash
npm i otplib qrcode
npm i -D @types/qrcode
```

Recommended flow, verifying before enabling, so a user can't get locked out by a botched setup:

```text
generate secret → show QR → user enters TOTP → verify code → enable 2FA
```

```ts
@Injectable()
export class OtpAuthenticationService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  generateSecret(email: string) {
    const secret = authenticator.generateSecret();
    const appName = this.configService.getOrThrow('TFA_APP_NAME');
    const uri = authenticator.keyuri(email, appName, secret);
    return { uri, secret };
  }

  verifyCode(code: string, secret: string): boolean {
    return authenticator.verify({ token: code, secret });
  }

  async enableTfaForUser(userId: number, secret: string) {
    await this.userRepository.update({ id: userId }, { tfaSecret: secret, isTfaEnabled: true });
  }
}
```

```ts
@Column({ default: false })
isTfaEnabled: boolean;

@Column({ nullable: true })
tfaSecret: string | null;
```

The TOTP secret cannot be hashed the way passwords are: the server needs the original value back to verify future codes. Protect it with encryption at rest, application-level encryption, or a secrets manager/KMS, matched to the project's threat model.

Generating the QR should not immediately flip `isTfaEnabled`:

```ts
@Auth(AuthMethod.Bearer)
@HttpCode(HttpStatus.OK)
@Post('2fa/generate')
async generateQrCode(@ActiveUser() user: AuthenticatedUser, @Res() response: Response) {
  const { secret, uri } = this.otpAuthService.generateSecret(user.email);

  // A complete implementation keeps this secret "pending" until a TOTP is
  // verified against it, rather than enabling it here.
  await this.otpAuthService.enableTfaForUser(user.sub, secret);

  response.type('png');
  return toFileStream(response, uri);
}
```

The safer split is `POST /2fa/generate` (stores a pending secret) followed by a separate `POST /2fa/enable` that verifies a submitted TOTP code before setting `isTfaEnabled = true`.

Validating during sign-in:

```ts
async signIn(dto: SignInDto) {
  const user = await this.validateCredentials(dto);

  if (user.isTfaEnabled) {
    if (!dto.tfaCode || !user.tfaSecret) {
      throw new UnauthorizedException('Two-factor authentication required');
    }

    const validTfa = this.otpAuthService.verifyCode(dto.tfaCode, user.tfaSecret);
    if (!validTfa) {
      throw new UnauthorizedException('Invalid 2FA code');
    }
  }

  return this.generateTokens(user);
}
```
