"use strict";
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
    return ((0, jsx_runtime_1.jsx)("button", { ref: ref, className: combinedClasses, ...props, children: children }));
});
exports.Button.displayName = 'Button';
exports.Input = react_1.default.forwardRef(({ className = '', error, ...props }, ref) => {
    const baseStyle = 'w-full bg-[#1A1A1A] border rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition-all duration-200';
    const normalBorder = 'border-neutral-800 focus:border-cosmic-neon focus:ring-1 focus:ring-cosmic-neon/30';
    const errorBorder = 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30';
    const combinedClasses = `${baseStyle} ${error ? errorBorder : normalBorder} ${className}`;
    return ((0, jsx_runtime_1.jsx)("input", { ref: ref, className: combinedClasses, ...props }));
});
exports.Input.displayName = 'Input';
exports.Card = react_1.default.forwardRef(({ className = '', ...props }, ref) => {
    return ((0, jsx_runtime_1.jsx)("div", { ref: ref, className: `bg-white rounded-[28px] border border-neutral-100 shadow-sm transition-all duration-300 ${className}`, ...props }));
});
exports.Card.displayName = 'Card';
const CardHeader = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("div", { className: `flex flex-col space-y-1.5 mb-4 ${className}`, ...props }));
exports.CardHeader = CardHeader;
exports.CardHeader.displayName = 'CardHeader';
const CardTitle = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("h3", { className: `text-lg font-bold text-white tracking-tight ${className}`, ...props }));
exports.CardTitle = CardTitle;
exports.CardTitle.displayName = 'CardTitle';
const CardDescription = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("p", { className: `text-sm text-neutral-400 ${className}`, ...props }));
exports.CardDescription = CardDescription;
exports.CardDescription.displayName = 'CardDescription';
const CardContent = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("div", { className: `${className}`, ...props }));
exports.CardContent = CardContent;
exports.CardContent.displayName = 'CardContent';
const CardFooter = ({ className = '', ...props }) => ((0, jsx_runtime_1.jsx)("div", { className: `flex items-center mt-6 pt-4 border-t border-neutral-800 ${className}`, ...props }));
exports.CardFooter = CardFooter;
exports.CardFooter.displayName = 'CardFooter';
//# sourceMappingURL=index.js.map