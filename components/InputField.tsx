import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, error, ...props }) => {
  const errorClasses = error 
    ? 'border-red-500 focus:border-red-500' 
    : 'border-gray-600 focus:border-[#FF9933]';

  return (
    <div className="relative h-24 pt-4">
      <input
        {...props}
        id={props.id || props.name}
        placeholder=" " 
        className={`peer w-full bg-transparent border-0 border-b-2 rounded-none py-2 px-1 text-gray-100 placeholder-transparent focus:outline-none focus:ring-0 transition-colors ${errorClasses}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || props.name}-error` : undefined}
      />
      <label
        htmlFor={props.id || props.name}
        className="absolute left-1 -top-2 text-gray-400 text-sm transition-all
                   peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-500 peer-placeholder-shown:top-6
                   peer-focus:-top-2 peer-focus:text-gray-400 peer-focus:text-sm"
      >
        {label}
      </label>
      {error && <p id={`${props.id || props.name}-error`} className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default InputField;