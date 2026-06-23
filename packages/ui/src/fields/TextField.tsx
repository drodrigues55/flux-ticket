import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form/Form';
import { Input, InputProps } from '../index';

interface TextFieldProps extends Omit<InputProps, 'name'> {
  name: string;
  label?: string;
  description?: string;
}

export function TextField({ name, label, description, className, ...props }: TextFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input {...field} {...props} error={!!fieldState.error} />
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
