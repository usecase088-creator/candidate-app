import { DEFAULT_FILTERS } from '../logic/filter';
import { resetFilterStoreForTests, selectFilterState, useFilterStore } from '../filterStore';

beforeEach(() => resetFilterStoreForTests());

describe('filter store (kept across tabs, reset on sign-out)', () => {
  it('starts with the website defaults', () => {
    expect(selectFilterState(useFilterStore.getState())).toEqual({
      query: '',
      city: '',
      category: null,
      ...DEFAULT_FILTERS,
    });
  });

  it('keeps what was typed and chosen until reset', () => {
    const s = useFilterStore.getState();
    s.setQuery('nurse');
    s.setCity('Kolkata');
    s.setCategory('Nurses');
    expect(useFilterStore.getState()).toMatchObject({ query: 'nurse', city: 'Kolkata', category: 'Nurses' });
  });

  it('toggles cities and job types on and off', () => {
    const s = useFilterStore.getState();
    s.toggleCity('Pune');
    s.toggleCity('Kolkata');
    s.toggleCity('Pune');
    s.toggleType('Locum');
    expect(useFilterStore.getState().cities).toEqual(['Kolkata']);
    expect(useFilterStore.getState().types).toEqual(['Locum']);
    useFilterStore.getState().toggleType('Locum');
    expect(useFilterStore.getState().types).toEqual([]);
  });

  it('sets experience, salary and sort', () => {
    const s = useFilterStore.getState();
    s.setMinExp(5);
    s.setMinSalary(10);
    s.setSort('salary');
    expect(useFilterStore.getState()).toMatchObject({ minExp: 5, minSalary: 10, sort: 'salary' });
  });

  it('clamps experience to 0-15 and salary to 0-50', () => {
    const s = useFilterStore.getState();
    s.setMinExp(99);
    s.setMinSalary(-4);
    expect(useFilterStore.getState()).toMatchObject({ minExp: 15, minSalary: 0 });
    s.setMinSalary(80);
    expect(useFilterStore.getState().minSalary).toBe(50);
  });

  it('resetFilters (the reset icon) clears filters and sort but not the typed search or the category', () => {
    const s = useFilterStore.getState();
    s.setQuery('nurse');
    s.setCategory('Nurses');
    s.toggleCity('Pune');
    s.setSort('salary');
    s.resetFilters();
    expect(useFilterStore.getState()).toMatchObject({
      query: 'nurse',
      category: 'Nurses',
      cities: [],
      sort: 'latest',
    });
  });

  it('resetAll (sign-out) clears everything', () => {
    const s = useFilterStore.getState();
    s.setQuery('nurse');
    s.setCategory('Nurses');
    s.toggleCity('Pune');
    s.resetAll();
    expect(selectFilterState(useFilterStore.getState())).toEqual({
      query: '',
      city: '',
      category: null,
      ...DEFAULT_FILTERS,
    });
  });
});
