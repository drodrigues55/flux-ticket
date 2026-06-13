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
    const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cosmic-neon/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
    
    const variants = {
      primary: 'bg-cosmic-neon text-[#121212] hover:bg-[#00b2c7] hover:shadow-[0_0_12px_rgba(0,229,255,0.4)]',
      secondary: 'bg-cosmic-grey text-white hover:bg-neutral-700',
      outline: 'border-2 border-cosmic-neon/30 text-cosmic-neon bg-transparent hover:bg-cosmic-neon/10 hover:border-cosmic-neon',
      ghost: 'text-neutral-400 hover:text-white hover:bg-neutral-800 bg-transparent',
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
    const baseStyle = 'w-full bg-[#1A1A1A] border rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition-all duration-200';
    const normalBorder = 'border-neutral-800 focus:border-cosmic-neon focus:ring-1 focus:ring-cosmic-neon/30';
    const errorBorder = 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30';
    
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
export interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-cosmic-slate border border-neutral-800/80 rounded-xl shadow-lg backdrop-blur-sm p-6 ${className}`}
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
  <h3 className={`text-lg font-bold text-white tracking-tight ${className}`} {...props} />
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = ({ className = '', ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-neutral-400 ${className}`} {...props} />
);
CardDescription.displayName = 'CardDescription';

export const CardContent = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`${className}`} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center mt-6 pt-4 border-t border-neutral-800 ${className}`} {...props} />
);
CardFooter.displayName = 'CardFooter';
