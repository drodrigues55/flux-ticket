import React, { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react';

// Versioning
export const UI_VERSION = '1.0.0';

// ==========================================
// Button Component
// ==========================================
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-[10px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[rgba(255,50,0,.15)] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      primary: 'bg-[#FF3200] text-white hover:bg-[#E62D00]',
      secondary: 'bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--surface-elevated)] border border-[var(--border)]',
      outline: 'border border-[var(--border-strong)] text-[var(--text-muted)] bg-transparent hover:text-[#FF3200] hover:border-[#FF3200]',
      ghost: 'text-[var(--text-muted)] hover:text-[#FF3200] hover:bg-[var(--surface-muted)] bg-transparent',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const combinedClasses = `${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={combinedClasses} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ==========================================
// Input Component
// ==========================================
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    const baseStyle = 'w-full h-12 bg-[var(--input-bg)] border rounded-[10px] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-subtle)] focus:outline-none transition-all duration-200';
    const normalBorder = 'border-[var(--border-strong)] focus:border-[#FF3200] focus:ring-[3px] focus:ring-[rgba(255,50,0,.15)]';
    const errorBorder = 'border-red-500 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/20';

    const combinedClasses = `${baseStyle} ${error ? errorBorder : normalBorder} ${className}`;

    return (
      <input ref={ref} className={combinedClasses} {...props} />
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// Card Components
// ==========================================
export interface CardProps extends HTMLAttributes<HTMLDivElement> { }

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-[var(--surface)] rounded-[20px] border border-[var(--border)] shadow-sm transition-all duration-300 text-[var(--text)] ${className}`}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 mb-4 ${className}`} {...props} />
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = ({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-bold text-[var(--text)] tracking-tight ${className}`} {...props} />
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = ({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-[var(--text-subtle)] ${className}`} {...props} />
);
CardDescription.displayName = 'CardDescription';

export const CardContent = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`${className}`} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center mt-6 pt-4 border-t border-[var(--border)] ${className}`} {...props} />
);
CardFooter.displayName = 'CardFooter';

// ==========================================
// Form System Exports
// ==========================================
export * from './form/Form';
export * from './hooks/useZodForm';
export * from './fields/TextField';
export * from './fields/TextareaField';
export * from './fields/DateField';
export * from './fields/NumberField';
export * from './fields/SelectField';
