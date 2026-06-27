import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form/Form';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name: string;
  label?: string;
  description?: string;
  options: { label: string; value: string | number }[];
}

export function SelectField({ name, label, description, options, className, ...props }: SelectFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const baseStyle = 'w-full h-12 bg-[#FAFAFA] border rounded-full px-4 py-2.5 text-sm text-neutral-800 focus:outline-none transition-all duration-200 focus:bg-white appearance-none cursor-pointer';
        const normalBorder = 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-[3px] focus:ring-[#FF3200]/10';
        const errorBorder = 'border-red-500 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/20';
        
        return (
          <FormItem className={className}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <div className="relative">
                <select
                  {...field}
                  {...props}
                  className={`${baseStyle} ${fieldState.error ? errorBorder : normalBorder} ${className || ''}`}
                >
                  <option value="" disabled hidden>
                    Selecione uma opção
                  </option>
                  {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </FormControl>
            {description && !fieldState.error && (
              <p className="text-xs text-neutral-400">{description}</p>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
