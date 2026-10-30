export type DatePickerProps = {
  /** Prefix for the Done / Cancel testIDs (`{id}.done`, `{id}.cancel`) where the platform shows them. */
  testID: string;
  visible: boolean;
  value: Date;
  onPick: (date: Date) => void;
  onClose: () => void;
  maximumDate?: Date;
  minimumDate?: Date;
};
