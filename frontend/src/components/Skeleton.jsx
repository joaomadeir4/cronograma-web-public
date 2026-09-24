export function SkeletonLinha({ w = "100%", h = 14, className = "" }) {
  return <div className={`skeleton ${className}`} style={{ width: w, height: h }} />;
}

export function SkeletonCard({ h = 90 }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <SkeletonLinha w="45%" h={16} />
          <SkeletonLinha w="70%" h={10} />
        </div>
        <SkeletonLinha w={70} h={32} className="rounded-md" />
      </div>
      {h > 90 && <div className="mt-3"><SkeletonLinha w="100%" h={h - 90} /></div>}
    </div>
  );
}

export function SkeletonLista({ n = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: n }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonPainel({ n = 5 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-3 space-y-2">
          <SkeletonLinha w="60%" h={9} />
          <SkeletonLinha w="40%" h={20} />
        </div>
      ))}
    </div>
  );
}
