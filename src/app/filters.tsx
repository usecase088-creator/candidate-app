import { RequireSession } from '@/features/auth/RequireSession';
import { FilterSheet } from '@/features/jobs/components/FilterSheet';

/** The Search tab's filters, presented as a bottom sheet over the tabs (D32; root layout sets the presentation). */
export default function FiltersRoute() {
  return (
    <RequireSession>
      <FilterSheet />
    </RequireSession>
  );
}
