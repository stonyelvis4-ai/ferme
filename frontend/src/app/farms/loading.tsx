import { Skeleton } from '../../components/ui/skeleton';

export default function FarmsLoading() {
  return (
    <div className="page-shell">
      <section className="farms-hero-card">
        <div className="stack-form">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-16 w-72" />
          <div className="module-kpi-grid">
            <Skeleton className="h-28 rounded-[24px]" />
            <Skeleton className="h-28 rounded-[24px]" />
            <Skeleton className="h-28 rounded-[24px]" />
          </div>
        </div>
      </section>

      <section className="module-catalog-grid">
        <Skeleton className="h-64 rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
        <Skeleton className="h-64 rounded-[28px]" />
      </section>
    </div>
  );
}
