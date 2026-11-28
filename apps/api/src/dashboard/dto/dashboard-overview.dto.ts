import { ApiProperty } from '@nestjs/swagger';

export class DashboardOverviewDto {
  @ApiProperty({ example: 42, description: 'Total active registered students' })
  activeEnrolments!: number;

  @ApiProperty({ example: 4, description: 'Total active cohort batches (UPCOMING or ONGOING)' })
  activeBatches!: number;

  @ApiProperty({ example: 1250000.0, description: 'Total reconciled collected revenue from PAID invoices (INR)' })
  reconciledRevenue!: number;

  @ApiProperty({ example: 18, description: 'Total internal active staff and faculty' })
  totalEmployees!: number;

  @ApiProperty({ example: 5, description: 'Total pending tax invoices (ISSUED or PARTIALLY_PAID)' })
  pendingInvoices!: number;

  @ApiProperty({ example: 2, description: 'Total upcoming cohort batches' })
  upcomingCohorts!: number;

  @ApiProperty({ example: 7, description: 'Total student KYC documents pending verification' })
  pendingKyc!: number;

  @ApiProperty({ example: 82.5, description: 'Average capacity utilization percentage across active batches' })
  capacityAvg!: number;
}
