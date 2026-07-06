import { Skeleton } from '../../../components/ui/skeleton';

export default function FarmDetailLoading() {
  return (
    <div className="page-shell">
      <section className="module-hero-grid">
        <Skeleton className="h-[340px] rounded-[30px]" />
        <Skeleton className="h-[340px] rounded-[30px]" />
      </section>

      <section className="module-catalog-grid">
        <Skeleton className="h-56 rounded-[28px]" />
        <Skeleton className="h-56 rounded-[28px]" />
        <Skeleton className="h-56 rounded-[28px]" />
      </section>

      <section className="module-split-grid">
        <Skeleton className="h-72 rounded-[28px]" />
        <Skeleton className="h-72 rounded-[28px]" />
      </section>
    </div>
  );
}
