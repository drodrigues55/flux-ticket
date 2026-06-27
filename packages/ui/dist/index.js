"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardFooter = exports.CardContent = exports.CardDescription = exports.CardTitle = exports.CardHeader = exports.Card = exports.Input = exports.Button = exports.UI_VERSION = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
// Versioning
exports.UI_VERSION = '1.0.0';
exports.Button = react_1.default.forwardRef(({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
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
    return ((0, jsx_runtime_1.jsx)("button", { ref: ref, className: combinedClasses, ...props, children: children }));
});
exports.Button.displayName = 'Button';
exports.Input = react_1.default.forwardRef(({ className = '', error, ...props }, ref) => {
    const baseStyle = 'w-full h-12 bg-[var(--input-bg)] border rounded-[10px] px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-subtle)] focus:outline-none transition-all duration-200';
    const normalBorder = 'border-[var(--border-strong)] focus:border-[#FF3200] focus:ring-[3px] focus:ring-[rgba(255,50,0,.15)]';
    const errorBorder = 'border-red-500 focus:border-red-500 focus:ring-[3px] focus:ring-red-500/20';
    const combinedClasses = `${baseStyle} ${error ? errorBorder : normalBorder} ${className}`;
    return ((0, jsx_runtime_1.jsx)("input", { ref: ref, className: combinedClasses, ...props }));
});
exports.Input.displayName = 'Input';
exports.Card = react_1.default.forwardRef(({ className = '', ...props }, ref) => {
    return ((0, jsx_runtime_1.jsx)("div", { ref: ref, className: `bg-[var(--surface)] rounded-[20px] border border-[var(--border)] shadow-sm transition-all duration-300 text-[var(--text)] ${className}`, ...props }));
});
exports.Card.displayName = 'Card';
const CardHeader = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("div", { className: `flex flex-col space-y-1.5 mb-4 ${className}`, ...props }));
exports.CardHeader = CardHeader;
exports.CardHeader.displayName = 'CardHeader';
const CardTitle = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("h3", { className: `text-lg font-bold text-[var(--text)] tracking-tight ${className}`, ...props }));
exports.CardTitle = CardTitle;
exports.CardTitle.displayName = 'CardTitle';
const CardDescription = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("p", { className: `text-sm text-[var(--text-subtle)] ${className}`, ...props }));
exports.CardDescription = CardDescription;
exports.CardDescription.displayName = 'CardDescription';
const CardContent = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("div", { className: `${className}`, ...props }));
exports.CardContent = CardContent;
exports.CardContent.displayName = 'CardContent';
const CardFooter = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("div", { className: `flex items-center mt-6 pt-4 border-t border-[var(--border)] ${className}`, ...props }));
exports.CardFooter = CardFooter;
exports.CardFooter.displayName = 'CardFooter';
// ==========================================
// Form System Exports
// ==========================================
__exportStar(require("./form/Form"), exports);
__exportStar(require("./hooks/useZodForm"), exports);
__exportStar(require("./fields/TextField"), exports);
__exportStar(require("./fields/TextareaField"), exports);
__exportStar(require("./fields/DateField"), exports);
__exportStar(require("./fields/NumberField"), exports);
__exportStar(require("./fields/SelectField"), exports);
//# sourceMappingURL=index.js.map