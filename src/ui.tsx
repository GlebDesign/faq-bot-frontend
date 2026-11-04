import { Children, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Check, ChevronDown, ChevronUp, X, Search } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';

/** Shared styled select. Native form values and labels are preserved. */
export function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  name,
  disabled,
  className = '',
  id,
  'aria-label': ariaLabel,
}: {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const props = child.props as { value?: string; children: ReactNode; disabled?: boolean };
      return {
        value: String(props.value ?? props.children),
        label: props.children,
        disabled: props.disabled,
      };
    });
  const [localValue, setLocalValue] = useState(defaultValue ?? options[0]?.value ?? '');
  const selected = value ?? localValue;
  const trigger = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLElement>();
  const generatedId = useId();
  useEffect(() => {
    setContainer(trigger.current?.closest('dialog') ?? undefined);
  }, []);
  const toInternal = (value: string) => value || '__faq_empty__';
  return (
    <>
      {name && <input type="hidden" name={name} value={selected} />}
      <SelectPrimitive.Root
        value={toInternal(selected)}
        disabled={disabled}
        onValueChange={(next) => {
          const value = next === '__faq_empty__' ? '' : next;
          setLocalValue(value);
          onValueChange?.(value);
        }}
      >
        <SelectPrimitive.Trigger
          ref={trigger}
          id={id ?? generatedId}
          aria-label={ariaLabel}
          className={`select-trigger ${className}`}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon className="select-chevron">
            <ChevronDown size={16} strokeWidth={1.7} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal container={container}>
          <SelectPrimitive.Content
            className="select-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="select-scroll">
              <ChevronUp size={14} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="select-viewport">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={toInternal(option.value)}
                  disabled={option.disabled}
                  className="select-option"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="select-check">
                    <Check size={15} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="select-scroll">
              <ChevronDown size={14} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <img src="/brand.svg" alt="" width="42" height="42" />
      FAQ bot
    </span>
  );
}
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'dark' | 'ghost';
  children: ReactNode;
}) {
  return (
    <button {...props} className={`button ${variant} ${className}`}>
      {children}
    </button>
  );
}
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function Badge({ children, good = false }: { children: ReactNode; good?: boolean }) {
  return <span className={`badge ${good ? 'good' : ''}`}>{children}</span>;
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Heading({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  const Title = title === 'Мои проекты' || title === 'Выберите пакет' ? 'h2' : 'h1';
  return (
    <div className="page-heading">
      <div>
        <Title>{title}</Title>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = 'Поиск…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="row between">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Прогресс"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`avatar ${className}`}>{name.slice(0, 1).toUpperCase()}</span>;
}
