export function Notice({ searchParams }: { searchParams?: { success?: string; error?: string } }) {
  if (searchParams?.error) return <div className="notice error" role="alert">{searchParams.error}</div>;
  if (searchParams?.success) return <div className="notice success" role="status">{searchParams.success}</div>;
  return null;
}
