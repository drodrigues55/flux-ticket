import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form/Form';

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  label?: string;
  description?: string;
}

export function TextareaField({ name, label, description, className, ...props }: TextareaFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const errorBorder = 'border-red-500 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/20';
        const normalBorder = 'border-[#DCDCDC] focus:border-[#FF3200] focus:ring-[3px] focus:ring-[#FF3200]/10';
        
        return (
          <FormItem className={className}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <textarea
                {...field}
                {...props}
                className={`w-full bg-[#FAFAFA] border rounded-2xl p-4 text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none transition-all duration-200 ${fieldState.error ? errorBorder : normalBorder} ${className || ''}`}
              />
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
