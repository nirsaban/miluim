'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'בחר...',
  disabled = false,
  className = '',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          min-h-[42px] px-3 py-2 border rounded-lg bg-canvas
          flex flex-wrap items-center gap-1.5 cursor-pointer
          ${disabled ? 'bg-surface-2 cursor-not-allowed opacity-50' : 'hover:border-accent'}
          ${isOpen ? 'border-accent ring-2 ring-accent/40' : 'border-border'}
        `}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-info-surface text-info-light border border-info-border rounded-md text-sm"
            >
              {opt.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.value, e)}
                  className="hover:bg-accent/20 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-content-muted">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-content-muted mr-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-elevated border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-content-muted text-center">אין אפשרויות</div>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center justify-between
                    ${isSelected ? 'bg-info-surface text-info-light' : 'text-content-primary hover:bg-surface-2'}
                  `}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-accent" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
