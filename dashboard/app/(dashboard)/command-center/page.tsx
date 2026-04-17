'use client';

import { useFilters } from '@/lib/use-filters';
import CommandCenterFilterBar from '@/components/command-center/CommandCenterFilterBar';
import {
  ExecutivePulse,
  RepMatrixGrid,
  LeadVelocityCards,
  PipelineGenerationChart,
  EconomicsTabs,
  ActivityMatrix,
  PipelineShed,
  AccountPenetrationChart,
  ArrWonYtdChart,
  BookingsVsGoalChart,
  DealsFlowChart,
  WeeklyOppsChart,
  ForecastCategoryPipeline,
  LargestOpenOppsTable,
  AeOutboundPipelineChart,
  DealsToAddressTable,
} from '@/components/command-center';

export default function CommandCenterPage() {
  const {
    dateRange,
    salesRepFilter,
    selectedOwnerId,
    startDate,
    endDate,
    handleDateRangeChange,
    handleSalesRepChange,
  } = useFilters();

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Real-time sales operations dashboard with pipeline, activity, and performance metrics
        </p>
      </div>

      {/* Global Filter Bar */}
      <CommandCenterFilterBar
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        salesRepFilter={salesRepFilter}
        onSalesRepChange={handleSalesRepChange}
      />

      {/* Main Dashboard Content */}
      <div className="flex flex-col gap-6">
        {/* Section 1: Executive Pulse */}
        <section>
          <ExecutivePulse ownerId={selectedOwnerId} />
        </section>

        {/* Section 2: Team Performance */}
        <section>
          <h2 className="text-xl font-bold mb-4">Team Performance</h2>
          <RepMatrixGrid ownerId={selectedOwnerId} />
        </section>

        {/* Section 3: Generation & Top of Funnel */}
        <section>
          <h2 className="text-xl font-bold mb-4">Generation & Top of Funnel</h2>
          <div className="flex flex-col gap-4">
            <LeadVelocityCards />
            <PipelineGenerationChart startDate={startDate} endDate={endDate} />
          </div>
        </section>

        {/* Section 4: Funnel Economics */}
        <section>
          <h2 className="text-xl font-bold mb-4">Funnel Economics</h2>
          <EconomicsTabs />
        </section>

        {/* Section 5: Activity Matrix & Pipeline Defense */}
        <section>
          <h2 className="text-xl font-bold mb-4">Activity Matrix & Pipeline Defense</h2>
          <div className="flex flex-col gap-4">
            <PipelineShed />
            <ActivityMatrix ownerId={selectedOwnerId} />
            <AccountPenetrationChart />
          </div>
        </section>

        {/* Section 6: Bookings & Goals */}
        <section>
          <h2 className="text-xl font-bold mb-4">Bookings vs Goals</h2>
          <div className="grid gap-4">
            <BookingsVsGoalChart periodType="annual" />
            <BookingsVsGoalChart periodType="quarterly" />
          </div>
        </section>

        {/* Section 7: Deal Flow */}
        <section>
          <h2 className="text-xl font-bold mb-4">Deal Flow</h2>
          <div className="grid gap-4">
            <ArrWonYtdChart periodType="monthly" />
            <DealsFlowChart />
          </div>
        </section>

        {/* Section 8: Pipeline & Forecast */}
        <section>
          <h2 className="text-xl font-bold mb-4">Pipeline & Forecast</h2>
          <div className="flex flex-col gap-4">
            <ForecastCategoryPipeline />
            <LargestOpenOppsTable limit={15} />
          </div>
        </section>

        {/* Section 9: Weekly Activity */}
        <section>
          <h2 className="text-xl font-bold mb-4">Weekly Activity</h2>
          <div className="flex flex-col gap-4">
            <WeeklyOppsChart />
            <AeOutboundPipelineChart />
          </div>
        </section>

        {/* Section 10: Deals to Address */}
        <section>
          <h2 className="text-xl font-bold mb-4">Deals to Address</h2>
          <DealsToAddressTable />
        </section>
      </div>
    </div>
  );
}