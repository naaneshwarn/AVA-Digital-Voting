import React from 'react';
import SpinnerIcon from './icons/SpinnerIcon.tsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', isLoading = false, ...props }) => {
  const baseClasses = 'font-poppins font-bold py-3 px-8 rounded-lg text-lg uppercase tracking-wider border-2 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0F172A] focus:ring-[#FF9933] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center';

  const variantClasses = {
    primary: `bg-gradient-to-r from-[#FF9933] to-[#E3842D] text-white border-transparent hover:shadow-[0_0_20px_#FF9933] disabled:from-gray-500 disabled:to-gray-600`,
    secondary: `bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500`
  };

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? <SpinnerIcon /> : children}
    </button>
  );
};

export default Button;