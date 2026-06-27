import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form/Form';
import { Input, InputProps } from '../index';

interface NumberFieldProps extends Omit<InputProps, 'name' | 'type'> {
  name: string;
  label?: string;
  description?: string;
}

export function NumberField({ name, label, description, className, ...props }: NumberFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { value, onChange, ...field }, fieldState }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input 
              type="number" 
              {...field}
              value={value ?? ''}
              onChange={(e) => {
                const val = (e.target as HTMLInputElement).value;
                onChange(val === '' ? undefined : Number(val));
              }}
              {...props} 
              error={!!fieldState.error} 
            />
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
