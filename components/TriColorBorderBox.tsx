import React from 'react';

type BorderStyle = 'default' | 'success' | 'error' | 'selected';

interface TriColorBorderBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isPulsing?: boolean;
  borderStyle?: BorderStyle;
}

const TriColorBorderBox: React.FC<TriColorBorderBoxProps> = ({ children, className = '', isPulsing = false, borderStyle = 'default', ...props }) => {
  
  const getBorderClasses = () => {
    switch (borderStyle) {
      case 'success':
        return 'border-2 border-green-500';
      case 'error':
        return 'border-2 border-red-600';
      case 'selected':
        return 'tri-gradient-border scale-105';
      case 'default':
      default:
        return 'border-2 border-gray-700';
    }
  };
  
  const getGlowAnimation = () => {
    if (isPulsing) return 'animate-pulse';
    switch (borderStyle) {
        case 'success': return 'animate-[glow-pulse-green_2s_infinite]';
        case 'error': return 'animate-[glow-pulse-red_2s_infinite]';
        case 'selected': return 'animate-[glow-pulse-saffron_2s_infinite]';
        default: return '';
    }
  }


  return (
    <div {...props} className={`${getBorderClasses()} ${getGlowAnimation()} ${className} transition-all duration-300`}>
      {children}
    </div>
  );
};

export default TriColorBorderBox;