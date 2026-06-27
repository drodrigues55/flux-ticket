import React, { ButtonHTMLAttributes, InputHTMLAttributes, HTMLAttributes } from 'react';
export declare const UI_VERSION = "1.0.0";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}
export declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
}
export declare const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;
export declare const CardHeader: {
    ({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.JSX.Element;
    displayName: string;
};
export declare const CardTitle: {
    ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): React.JSX.Element;
    displayName: string;
};
export declare const CardDescription: {
    ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>): React.JSX.Element;
    displayName: string;
};
export declare const CardContent: {
    ({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.JSX.Element;
    displayName: string;
};
export declare const CardFooter: {
    ({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.JSX.Element;
    displayName: string;
};
export * from './form/Form';
export * from './hooks/useZodForm';
export * from './fields/TextField';
export * from './fields/TextareaField';
export * from './fields/DateField';
export * from './fields/NumberField';
export * from './fields/SelectField';
//# sourceMappingURL=index.d.ts.map