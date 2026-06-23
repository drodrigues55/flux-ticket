import { useForm, UseFormProps, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodType } from 'zod';

export interface UseZodFormProps<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: ZodType<T>;
}

export function useZodForm<T extends FieldValues>({ schema, ...formProps }: UseZodFormProps<T>) {
  return useForm<T>({
    ...formProps,
    resolver: zodResolver(schema),
  });
}
