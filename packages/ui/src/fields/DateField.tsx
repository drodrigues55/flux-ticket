import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form/Form';
import { Input, InputProps } from '../index';

interface DateFieldProps extends Omit<InputProps, 'name' | 'type'> {
  name: string;
  label?: string;
  description?: string;
}

export function DateField({ name, label, description, className, ...props }: DateFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input type="date" {...field} {...props} error={!!fieldState.error} />
          </FormControl>
          {description && !fieldState.error && (
            <p className="text-xs text-neutral-400">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TimeField({ name, label, description, className, ...props }: DateFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input type="time" {...field} {...props} error={!!fieldState.error} />
          </FormControl>
          {description && !fieldState.error && (
            <p className="text-xs text-neutral-400">{description}</p>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
