'use client';

import { FilterableMultiSelect } from '@carbon/react';
import type { Option } from '../../model/taxonomy.schema';

type OptionMultiSelectProps = {
  id: string;
  titleText: string;
  helperText?: string;
  placeholder: string;
  options: Option[];
  /** Selected option ids (controlled). */
  value: string[];
  onChange: (ids: string[]) => void;
  onBlur?: () => void;
  invalidText?: string;
  /** Visually hide the label (it stays available to screen readers). */
  hideLabel?: boolean;
};

/** Filterable multi-select over taxonomy options, controlled by ids (RHF-friendly). */
export function OptionMultiSelect({
  id,
  titleText,
  helperText,
  placeholder,
  options,
  value,
  onChange,
  onBlur,
  invalidText,
  hideLabel = false,
}: OptionMultiSelectProps) {
  const selected = options.filter((option) => value.includes(option.id));
  return (
    <FilterableMultiSelect<Option>
      id={id}
      titleText={titleText}
      hideLabel={hideLabel}
      helperText={helperText}
      placeholder={placeholder}
      items={options}
      itemToString={(item) => (item ? item.label : '')}
      selectedItems={selected}
      onChange={({ selectedItems }) => onChange(selectedItems.map((item) => item.id))}
      onMenuChange={(isOpen) => {
        if (!isOpen) onBlur?.();
      }}
      invalid={Boolean(invalidText)}
      invalidText={invalidText}
      selectionFeedback="top-after-reopen"
    />
  );
}
