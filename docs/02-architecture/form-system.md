# Form System Architecture

The Flux Tickets platform uses a centralized, reusable Form System built on top of **React Hook Form** and **Zod**. This ensures a schema-first, type-safe, and highly performant experience across all portals (Organizer, Staff, Consumer).

## Core Principles

1. **Schema-Driven Validation**: All validation logic lives in `@flux/types/src/validation`. Components never perform manual validation.
2. **Minimal Boilerplate**: Developers should use the highly abstracted field components (e.g., `<TextField />`, `<SelectField />`) instead of manually wiring up React Hook Form's `register` or `Controller`.
3. **Accessibility (a11y)**: The system automatically links `FormLabel`, `FormControl`, and `FormMessage` via `aria-describedby` and `aria-invalid`.

## Package Locations

- **`@flux/types/validation/*`**: Zod schemas.
- **`@flux/ui/form/Form.tsx`**: Context providers and accessible wrappers.
- **`@flux/ui/fields/*`**: Plug-and-play field components (`TextField`, `DateField`, etc.).
- **`@flux/ui/hooks/useZodForm`**: Hook wrapper for `useForm` combined with `zodResolver`.

## Usage Example

```tsx
import { useZodForm, Form, TextField, DateField, Button } from '@flux/ui';
import { EventSchema } from '@flux/types';

export function CreateEventForm() {
  const form = useZodForm({
    schema: EventSchema,
    defaultValues: { title: '', date: '' }
  });

  const onSubmit = async (data) => {
    // API Call
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <TextField name="title" label="Event Title" description="The public name of the event." />
        <DateField name="date" label="Start Date" />
        <Button type="submit">Save Event</Button>
      </form>
    </Form>
  );
}
```

## Wizard & Multi-Step Forms

For multi-step forms, do not persist data exclusively in the DOM. Use a global store like **Zustand** combined with `sessionStorage` to hold the accumulated payload. Each step is an isolated form with its own partial schema.
