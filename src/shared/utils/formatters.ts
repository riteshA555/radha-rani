// Utility function to format numbers in Indian numbering system
// Example: 1234567 => 12,34,567 (12 lakhs 34 thousand 567)
export const formatIndianRupees = (amount: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.00'
    const amountStr = Math.abs(amount).toFixed(2)
    const [integerPart, decimalPart] = amountStr.split('.')

    // Indian numbering: first 3 digits from right, then groups of 2
    let lastThree = integerPart.substring(integerPart.length - 3)
    const otherNumbers = integerPart.substring(0, integerPart.length - 3)

    if (otherNumbers !== '') {
        lastThree = ',' + lastThree
    }

    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree

    return amount < 0 ? `-${formatted}.${decimalPart}` : `${formatted}.${decimalPart}`
}

// Format without decimal places
export const formatIndianRupeesWhole = (amount: number): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0'
    const amountStr = Math.abs(amount).toString()

    let lastThree = amountStr.substring(amountStr.length - 3)
    const otherNumbers = amountStr.substring(0, amountStr.length - 3)

    if (otherNumbers !== '') {
        lastThree = ',' + lastThree
    }

    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree

    return amount < 0 ? `-${formatted}` : formatted
}
