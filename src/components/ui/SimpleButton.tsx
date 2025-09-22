import * as React from "react"

export interface SimpleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg"
}

const SimpleButton = React.forwardRef<HTMLButtonElement, SimpleButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variantClasses = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    }
    
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
    }

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`

    return (
      <button
        className={combinedClasses}
        ref={ref}
        {...props}
      />
    )
  }
)
SimpleButton.displayName = "SimpleButton"

export { SimpleButton }

// Ensure this file is treated as a module
export {}
