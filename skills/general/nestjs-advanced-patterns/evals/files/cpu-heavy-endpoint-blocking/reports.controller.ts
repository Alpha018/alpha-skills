@Controller('reports')
export class ReportsController {
  @Get('summary')
  generateSummary(@Query('rows') rows: number) {
    // synchronously builds a large in-memory aggregation report,
    // sometimes taking 8-15 seconds for large row counts
    return buildHeavyReport(rows);
  }
}
