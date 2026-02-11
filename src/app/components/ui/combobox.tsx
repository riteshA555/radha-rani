"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react"

import { cn } from "./utils"
import { Button } from "./button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "./command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./popover"

export interface ComboboxOption {
    value: string
    label: string
}

interface ComboboxProps {
    options: ComboboxOption[]
    value?: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: React.ReactNode
    allowCustom?: boolean
    onCustomAdd?: (value: string) => void
    className?: string
    loading?: boolean
    id?: string
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    emptyMessage = "No options found.",
    allowCustom = false,
    onCustomAdd,
    className,
    loading = false,
    id,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState("")

    // Reset search when opening/closing
    React.useEffect(() => {
        if (!open) {
            setSearchValue("");
        }
    }, [open]);

    const selectedOption = options.find((option) => option.value === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    type="button"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-bold", className)}
                    id={id}
                >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-full min-w-[300px] p-0 shadow-2xl border-gray-200 z-[99999]"
                align="start"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
            >
                <Command className="w-full">
                    <CommandInput
                        placeholder={searchPlaceholder}
                        autoFocus
                        value={searchValue}
                        onValueChange={setSearchValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && allowCustom && searchValue.trim()) {
                                onCustomAdd?.(searchValue);
                                setOpen(false);
                                setSearchValue("");
                            }
                        }}
                    />
                    <CommandList>
                        {loading && (
                            <div className="py-6 text-center text-sm text-gray-500 font-medium flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                Loading...
                            </div>
                        )}
                        <CommandEmpty>
                            {allowCustom && searchValue.trim() !== "" ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onCustomAdd?.(searchValue)
                                        setOpen(false)
                                        setSearchValue("")
                                    }}
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 outline-none"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add "{searchValue}"
                                </button>
                            ) : (
                                <div className="py-6 text-center text-sm text-gray-500 font-medium">
                                    {emptyMessage}
                                </div>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.label}
                                    onSelect={() => {
                                        onValueChange(option.value)
                                        setOpen(false)
                                    }}
                                    className="font-bold py-2"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
