# TypeScript & Advanced Patterns 🔷

Master production-ready TypeScript patterns for React development with type safety, generics, and advanced techniques used in enterprise applications.

## Table of Contents

- [TypeScript Setup & Configuration](#typescript-setup--configuration)
- [Component Typing Patterns](#component-typing-patterns)
- [Advanced Hook Typing](#advanced-hook-typing)
- [Generic Components & Utilities](#generic-components--utilities)
- [API Integration & Type Safety](#api-integration--type-safety)

---

## TypeScript Setup & Configuration

### Modern TypeScript Configuration

```json
// tsconfig.json - Production-ready configuration
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"]
    },
    // Advanced type checking
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "dist"]
}
```

### Essential Type Definitions

```typescript
// src/types/common.ts
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>;

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Brand types for type safety
export type Brand<T, TBrand extends string> = T & { __brand: TBrand };
export type UserId = Brand<string, "UserId">;
export type ProductId = Brand<string, "ProductId">;
export type Email = Brand<string, "Email">;

// API Response types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Entity base types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  id: UserId;
  email: Email;
  name: string;
  avatar?: string;
  role: "admin" | "user" | "moderator";
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
  };
}
```

---

## Component Typing Patterns

### Comprehensive Component Props

```typescript
// Advanced prop typing patterns
import { ReactNode, ComponentProps, FC, PropsWithChildren } from "react";

// Base component props with common patterns
interface BaseComponentProps {
  className?: string;
  testId?: string;
  "aria-label"?: string;
}

// Button component with all variants
interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

const Button: FC<ButtonProps> = ({ variant = "primary", size = "md", disabled = false, loading = false, leftIcon, rightIcon, children, className = "", testId, onClick, type = "button", ...rest }) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    onClick?.(event);
  };

  return (
    <button type={type} className={`btn btn-${variant} btn-${size} ${className} ${disabled ? "disabled" : ""} ${loading ? "loading" : ""}`} onClick={handleClick} disabled={disabled || loading} data-testid={testId} aria-busy={loading} {...rest}>
      {loading && <Spinner size="sm" />}
      {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
    </button>
  );
};

// Form components with strict typing
interface FormFieldProps<T = string> extends BaseComponentProps {
  name: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
}

// Generic input component
function Input<T extends string | number>({ name, label, value, onChange, error, required = false, disabled = false, placeholder, helperText, className = "", testId, ...rest }: FormFieldProps<T> & { type?: "text" | "email" | "password" | "number" }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue as T);
  };

  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={name} className={required ? "required" : ""}>
        {label}
      </label>

      <input id={name} name={name} value={value} onChange={handleChange} placeholder={placeholder} disabled={disabled} data-testid={testId} aria-describedby={error ? `${name}-error` : undefined} aria-invalid={!!error} {...rest} />

      {helperText && <span className="helper-text">{helperText}</span>}

      {error && (
        <span id={`${name}-error`} className="error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// Complex component with discriminated unions
type AlertVariant = "success" | "warning" | "error" | "info";

interface BaseAlertProps {
  title?: string;
  className?: string;
  onDismiss?: () => void;
  children: ReactNode;
}

interface DismissibleAlert extends BaseAlertProps {
  variant: AlertVariant;
  dismissible: true;
  onDismiss: () => void;
}

interface NonDismissibleAlert extends BaseAlertProps {
  variant: AlertVariant;
  dismissible?: false;
  onDismiss?: never;
}

type AlertProps = DismissibleAlert | NonDismissibleAlert;

const Alert: FC<AlertProps> = ({ variant, title, dismissible = false, onDismiss, children, className = "" }) => {
  return (
    <div className={`alert alert-${variant} ${className}`} role="alert">
      <div className="alert-content">
        {title && <h4 className="alert-title">{title}</h4>}
        <div className="alert-body">{children}</div>
      </div>

      {dismissible && onDismiss && (
        <button className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss alert">
          ×
        </button>
      )}
    </div>
  );
};
```

### Component Composition Patterns

```typescript
// Compound component pattern with TypeScript
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("useTabs must be used within a Tabs component");
  }
  return context;
};

interface TabsProps {
  defaultTab?: string;
  value?: string;
  onChange?: (tab: string) => void;
  children: ReactNode;
  className?: string;
}

const Tabs: FC<TabsProps> & {
  List: FC<TabsListProps>;
  Tab: FC<TabProps>;
  Panel: FC<TabPanelProps>;
} = ({ defaultTab, value, onChange, children, className = "" }) => {
  const [internalValue, setInternalValue] = useState(defaultTab || "");

  const activeTab = value ?? internalValue;
  const setActiveTab = onChange ?? setInternalValue;

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`tabs ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps extends BaseComponentProps {
  children: ReactNode;
}

const TabsList: FC<TabsListProps> = ({ children, className = "" }) => (
  <div className={`tabs-list ${className}`} role="tablist">
    {children}
  </div>
);

interface TabProps extends BaseComponentProps {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}

const Tab: FC<TabProps> = ({ value, disabled = false, children, className = "" }) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button className={`tab ${isActive ? "active" : ""} ${className}`} role="tab" tabIndex={isActive ? 0 : -1} aria-selected={isActive} disabled={disabled} onClick={() => !disabled && setActiveTab(value)}>
      {children}
    </button>
  );
};

interface TabPanelProps extends BaseComponentProps {
  value: string;
  children: ReactNode;
}

const TabPanel: FC<TabPanelProps> = ({ value, children, className = "" }) => {
  const { activeTab } = useTabs();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div className={`tab-panel ${className}`} role="tabpanel">
      {children}
    </div>
  );
};

// Attach compound components
Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;

export { Tabs };

// Usage example with full type safety
function App() {
  return (
    <Tabs defaultTab="profile">
      <Tabs.List>
        <Tabs.Tab value="profile">Profile</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
        <Tabs.Tab value="billing" disabled>
          Billing
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="profile">
        <UserProfile />
      </Tabs.Panel>

      <Tabs.Panel value="settings">
        <UserSettings />
      </Tabs.Panel>

      <Tabs.Panel value="billing">
        <BillingSettings />
      </Tabs.Panel>
    </Tabs>
  );
}
```

---

## Advanced Hook Typing

### Generic Hooks with Type Safety

```typescript
// Advanced state management hooks
import { useCallback, useReducer, useRef, useEffect } from "react";

// Generic async state hook
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type AsyncAction<T> = { type: "LOADING" } | { type: "SUCCESS"; payload: T } | { type: "ERROR"; payload: string } | { type: "RESET" };

function asyncReducer<T>(state: AsyncState<T>, action: AsyncAction<T>): AsyncState<T> {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: true, error: null };
    case "SUCCESS":
      return { data: action.payload, loading: false, error: null };
    case "ERROR":
      return { ...state, loading: false, error: action.payload };
    case "RESET":
      return { data: null, loading: false, error: null };
    default:
      return state;
  }
}

interface UseAsyncOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

function useAsync<T, TArgs extends unknown[] = []>(asyncFunction: (...args: TArgs) => Promise<T>, options: UseAsyncOptions<T> = {}) {
  const { initialData, onSuccess, onError } = options;

  const [state, dispatch] = useReducer(asyncReducer<T>, {
    data: initialData || null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: TArgs) => {
      dispatch({ type: "LOADING" });

      try {
        const result = await asyncFunction(...args);
        dispatch({ type: "SUCCESS", payload: result });
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "ERROR", payload: errorMessage });
        onError?.(errorMessage);
        throw error;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Form management hook with validation
interface ValidationRule<T> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
}

interface FormField<T> {
  value: T;
  error: string | null;
  touched: boolean;
}

type FormFields<T> = {
  [K in keyof T]: FormField<T[K]>;
};

type FormValidation<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

function useForm<T extends Record<string, any>>(initialValues: T, validation: FormValidation<T> = {}) {
  const [fields, setFields] = useState<FormFields<T>>(() =>
    Object.keys(initialValues).reduce(
      (acc, key) => ({
        ...acc,
        [key]: {
          value: initialValues[key as keyof T],
          error: null,
          touched: false,
        },
      }),
      {} as FormFields<T>
    )
  );

  const validateField = useCallback(
    <K extends keyof T>(name: K, value: T[K]): string | null => {
      const rules = validation[name];
      if (!rules) return null;

      if (rules.required && (!value || (typeof value === "string" && !value.trim()))) {
        return `${String(name)} is required`;
      }

      if (typeof value === "string") {
        if (rules.minLength && value.length < rules.minLength) {
          return `${String(name)} must be at least ${rules.minLength} characters`;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          return `${String(name)} must be no more than ${rules.maxLength} characters`;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          return `${String(name)} format is invalid`;
        }
      }

      if (rules.custom) {
        return rules.custom(value);
      }

      return null;
    },
    [validation]
  );

  const setValue = useCallback(
    <K extends keyof T>(name: K, value: T[K]) => {
      const error = validateField(name, value);

      setFields((prev) => ({
        ...prev,
        [name]: {
          value,
          error,
          touched: true,
        },
      }));
    },
    [validateField]
  );

  const setTouched = useCallback(<K extends keyof T>(name: K) => {
    setFields((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched: true,
      },
    }));
  }, []);

  const validateAll = useCallback(() => {
    const newFields = { ...fields };
    let isValid = true;

    Object.keys(fields).forEach((key) => {
      const fieldKey = key as keyof T;
      const error = validateField(fieldKey, fields[fieldKey].value);

      newFields[fieldKey] = {
        ...newFields[fieldKey],
        error,
        touched: true,
      };

      if (error) {
        isValid = false;
      }
    });

    setFields(newFields);
    return isValid;
  }, [fields, validateField]);

  const reset = useCallback(() => {
    setFields(
      Object.keys(initialValues).reduce(
        (acc, key) => ({
          ...acc,
          [key]: {
            value: initialValues[key as keyof T],
            error: null,
            touched: false,
          },
        }),
        {} as FormFields<T>
      )
    );
  }, [initialValues]);

  const values = useMemo(
    () =>
      Object.keys(fields).reduce(
        (acc, key) => ({
          ...acc,
          [key]: fields[key as keyof T].value,
        }),
        {} as T
      ),
    [fields]
  );

  const errors = useMemo(
    () =>
      Object.keys(fields).reduce((acc, key) => {
        const field = fields[key as keyof T];
        if (field.error && field.touched) {
          acc[key as keyof T] = field.error;
        }
        return acc;
      }, {} as Partial<Record<keyof T, string>>),
    [fields]
  );

  const isValid = useMemo(() => Object.values(errors).every((error) => !error), [errors]);

  return {
    fields,
    values,
    errors,
    isValid,
    setValue,
    setTouched,
    validateAll,
    reset,
  };
}

// Usage examples
function UserRegistrationForm() {
  const { values, errors, setValue, validateAll, isValid } = useForm(
    {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    {
      email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: {
        required: true,
        minLength: 8,
      },
      confirmPassword: {
        required: true,
        custom: (value) => {
          return value === values.password ? null : "Passwords do not match";
        },
      },
      name: {
        required: true,
        minLength: 2,
      },
    }
  );

  const { execute: registerUser, loading } = useAsync(async (userData: typeof values) => {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    return response.json();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) {
      return;
    }

    try {
      await registerUser(values);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="name" label="Full Name" value={values.name} onChange={(value) => setValue("name", value)} error={errors.name} required />

      <Input name="email" label="Email" type="email" value={values.email} onChange={(value) => setValue("email", value)} error={errors.email} required />

      <Input name="password" label="Password" type="password" value={values.password} onChange={(value) => setValue("password", value)} error={errors.password} required />

      <Input name="confirmPassword" label="Confirm Password" type="password" value={values.confirmPassword} onChange={(value) => setValue("confirmPassword", value)} error={errors.confirmPassword} required />

      <Button type="submit" disabled={!isValid || loading} loading={loading}>
        Register
      </Button>
    </form>
  );
}
```

---

## Generic Components & Utilities

### Advanced Generic Patterns

```typescript
// Generic data table component
interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onSort?: (key: keyof T, direction: "asc" | "desc") => void;
  onRowClick?: (item: T) => void;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  className?: string;
}

function DataTable<T extends { id: string | number }>({ data, columns, loading = false, onSort, onRowClick, selectedIds = [], onSelectionChange, className = "" }: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: keyof T) => {
    if (!columns.find((col) => col.key === column)?.sortable) return;

    const newDirection = sortColumn === column && sortDirection === "asc" ? "desc" : "asc";

    setSortColumn(column);
    setSortDirection(newDirection);
    onSort?.(column, newDirection);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map((item) => item.id));
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  if (loading) {
    return <TableSkeleton columns={columns.length} rows={5} />;
  }

  return (
    <div className={`data-table ${className}`}>
      <table>
        <thead>
          <tr>
            {onSelectionChange && (
              <th>
                <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} indeterminate={selectedIds.length > 0 && selectedIds.length < data.length} onChange={handleSelectAll} />
              </th>
            )}
            {columns.map((column) => (
              <th key={String(column.key)} style={{ width: column.width }} className={column.sortable ? "sortable" : ""} onClick={() => column.sortable && handleSort(column.key)}>
                {column.header}
                {column.sortable && sortColumn === column.key && <span className={`sort-indicator ${sortDirection}`}>{sortDirection === "asc" ? "↑" : "↓"}</span>}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr key={item.id} className={`${onRowClick ? "clickable" : ""} ${selectedIds.includes(item.id) ? "selected" : ""}`} onClick={() => onRowClick?.(item)}>
              {onSelectionChange && (
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectRow(item.id)} />
                </td>
              )}
              {columns.map((column) => (
                <td key={String(column.key)}>{column.render ? column.render(item[column.key], item) : String(item[column.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Usage with full type safety
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  status: "active" | "inactive";
  createdAt: string;
}

function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product Name",
      sortable: true,
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (price) => `$${price.toFixed(2)}`,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      render: (stock) => <span className={stock > 0 ? "in-stock" : "out-of-stock"}>{stock}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (status) => <Badge variant={status === "active" ? "success" : "secondary"}>{status}</Badge>,
    },
  ];

  return <DataTable data={products} columns={columns} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onRowClick={(product) => console.log("Clicked:", product)} onSort={(key, direction) => console.log("Sort:", key, direction)} />;
}

// Generic modal component
interface ModalProps<T = unknown> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  data?: T;
  onConfirm?: (data?: T) => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

function Modal<T = unknown>({ isOpen, onClose, title, children, size = "md", data, onConfirm, confirmText = "Confirm", cancelText = "Cancel", loading = false }: ModalProps<T>) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal-body">{children}</div>

        {onConfirm && (
          <footer className="modal-footer">
            <Button variant="secondary" onClick={onClose}>
              {cancelText}
            </Button>
            <Button onClick={() => onConfirm(data)} loading={loading}>
              {confirmText}
            </Button>
          </footer>
        )}
      </div>
    </div>
  );
}
```

---

## API Integration & Type Safety

### Typed API Client

```typescript
// API client with full type safety
interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

class TypedApiClient {
  private config: Required<ApiConfig>;

  constructor(config: ApiConfig) {
    this.config = {
      timeout: 30000,
      headers: {},
      ...config,
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...this.config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T, TBody = unknown>(endpoint: string, body: TBody): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T, TBody = unknown>(endpoint: string, body: TBody): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Typed API service
class UserService {
  constructor(private api: TypedApiClient) {}

  async getUsers(): Promise<User[]> {
    const response = await this.api.get<User[]>("/users");
    return response.data;
  }

  async getUserById(id: UserId): Promise<User> {
    const response = await this.api.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(userData: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const response = await this.api.post<User>("/users", userData);
    return response.data;
  }

  async updateUser(id: UserId, updates: Partial<User>): Promise<User> {
    const response = await this.api.put<User>(`/users/${id}`, updates);
    return response.data;
  }

  async deleteUser(id: UserId): Promise<void> {
    await this.api.delete<void>(`/users/${id}`);
  }
}

// React Query integration with TypeScript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Query keys with type safety
const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: UserId) => [...userKeys.details(), id] as const,
};

// Typed hooks
function useUsers(filters?: string) {
  return useQuery({
    queryKey: userKeys.list(filters || ""),
    queryFn: () => userService.getUsers(),
  });
}

function useUser(id: UserId) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getUserById(id),
    enabled: !!id,
  });
}

function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: UserId; updates: Partial<User> }) => userService.updateUser(id, updates),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

// Usage in components
function UserManagement() {
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const handleCreateUser = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    try {
      await createUser.mutateAsync(userData);
      toast.success("User created successfully");
    } catch (error) {
      toast.error("Failed to create user");
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <UserCreateForm onSubmit={handleCreateUser} />
      <UserList users={users || []} onUpdate={updateUser.mutate} />
    </div>
  );
}
```

---

## Summary & Best Practices

### 🎯 Key TypeScript Patterns

✅ **Strict Configuration**: Enable all strict mode options for better type safety  
✅ **Generic Components**: Build reusable components with proper type constraints  
✅ **Branded Types**: Use brand types for domain-specific type safety  
✅ **Discriminated Unions**: Model complex state with type-safe unions  
✅ **API Type Safety**: End-to-end type safety from API to UI

### 📈 Implementation Strategy

1. **Start with Strict Config**

   - Enable strict mode and additional checks
   - Set up path mapping for clean imports
   - Configure proper type checking rules

2. **Build Type-Safe Foundation**

   - Define domain entities and DTOs
   - Create utility types for common patterns
   - Build typed API clients

3. **Component Type Safety**

   - Use discriminated unions for complex props
   - Implement generic components properly
   - Add proper event typing

4. **Advanced Patterns**
   - Custom hooks with generic constraints
   - Form validation with type safety
   - Error boundaries with typed error handling

### ⚠️ Common TypeScript Pitfalls

- **Any Usage**: Avoid `any` type; use `unknown` when needed
- **Type Assertions**: Prefer type guards over assertions
- **Missing Generics**: Don't forget to constrain generic types
- **Event Typing**: Use proper React event types
- **Ref Typing**: Use correct ref types for DOM elements

**📈 Next Steps:**
Ready to secure your React applications? Continue with [Security & Production Readiness](./08-security-production-readiness.md) to learn about XSS prevention, environment configuration, and production deployment strategies.

---

_💡 Pro Tip: TypeScript's power comes from strict configuration and proper type modeling. Invest time in getting the types right, and the compiler will catch bugs before they reach production._
