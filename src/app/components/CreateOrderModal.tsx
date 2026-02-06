import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, User, Package, IndianRupee, CheckCircle } from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
}

export function CreateOrderModal({ onClose }: CreateOrderModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Customer Details
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    
    // Step 2: Product Details
    productType: '',
    productName: '',
    metal: '',
    purity: '',
    weight: '',
    quantity: '1',
    description: '',
    
    // Step 3: Pricing & Payment
    goldRate: '6280',
    makingCharges: '',
    stoneCharges: '',
    gst: '3',
    advancePayment: '',
    paymentMode: 'cash',
    
    // Step 4: Delivery
    deliveryDate: '',
    karigar: '',
    priority: 'normal',
    notes: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const weight = parseFloat(formData.weight) || 0;
    const rate = parseFloat(formData.goldRate) || 0;
    const making = parseFloat(formData.makingCharges) || 0;
    const stone = parseFloat(formData.stoneCharges) || 0;
    const gstRate = parseFloat(formData.gst) || 0;
    
    const metalValue = weight * rate;
    const subtotal = metalValue + making + stone;
    const gstAmount = (subtotal * gstRate) / 100;
    const total = subtotal + gstAmount;
    
    return {
      metalValue,
      subtotal,
      gstAmount,
      total,
    };
  };

  const totals = calculateTotal();

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    // Handle order creation
    console.log('Order Data:', formData);
    alert('Order created successfully!');
    onClose();
  };

  const steps = [
    { number: 1, label: 'Customer', icon: User },
    { number: 2, label: 'Product', icon: Package },
    { number: 3, label: 'Payment', icon: IndianRupee },
    { number: 4, label: 'Confirm', icon: CheckCircle },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg flex flex-col max-h-screen sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl sm:rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => {
              const StepIcon = s.icon;
              const isActive = step === s.number;
              const isCompleted = step > s.number;

              return (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isActive || isCompleted
                          ? 'text-gray-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-2 mb-6 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Customer Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Customer Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => updateField('customerEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.customerAddress}
                  onChange={(e) => updateField('customerAddress', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter customer address"
                />
              </div>
            </div>
          )}

          {/* Step 2: Product Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Product Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Type *
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) => updateField('productType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select type</option>
                  <option value="ring">Ring</option>
                  <option value="necklace">Necklace</option>
                  <option value="bracelet">Bracelet</option>
                  <option value="earrings">Earrings</option>
                  <option value="chain">Chain</option>
                  <option value="bangle">Bangle</option>
                  <option value="pendant">Pendant</option>
                  <option value="anklet">Anklet</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.productName}
                  onChange={(e) => updateField('productName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Gold Ring Set"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metal *
                  </label>
                  <select
                    value={formData.metal}
                    onChange={(e) => updateField('metal', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select metal</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purity *
                  </label>
                  <select
                    value={formData.purity}
                    onChange={(e) => updateField('purity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select purity</option>
                    <option value="24K">24K (999)</option>
                    <option value="22K">22K (916)</option>
                    <option value="18K">18K (750)</option>
                    <option value="14K">14K (585)</option>
                    <option value="925">925 Silver</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (grams) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => updateField('weight', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => updateField('quantity', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Additional details, design specifications, etc."
                />
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Payment */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pricing & Payment
              </h3>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gold Rate (per gram)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.goldRate}
                      onChange={(e) => updateField('goldRate', e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Making Charges
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.makingCharges}
                      onChange={(e) => updateField('makingCharges', e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stone/Diamond Charges
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={formData.stoneCharges}
                      onChange={(e) => updateField('stoneCharges', e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.gst}
                    onChange={(e) => updateField('gst', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-gray-300 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Metal Value:</span>
                    <span className="font-medium">
                      ₹{totals.metalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      ₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST:</span>
                    <span className="font-medium">
                      ₹{totals.gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2">
                    <span>Total Amount:</span>
                    <span className="text-indigo-600">
                      ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Payment
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={formData.advancePayment}
                    onChange={(e) => updateField('advancePayment', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => updateField('paymentMode', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Delivery & Confirmation */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery & Confirmation
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date *
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => updateField('deliveryDate', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Karigar
                </label>
                <select
                  value={formData.karigar}
                  onChange={(e) => updateField('karigar', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select karigar (optional)</option>
                  <option value="Ramesh">Ramesh</option>
                  <option value="Suresh">Suresh</option>
                  <option value="Mahesh">Mahesh</option>
                  <option value="Dinesh">Dinesh</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['normal', 'urgent', 'rush'].map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => updateField('priority', priority)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        formData.priority === priority
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Any special instructions or notes..."
                />
              </div>

              {/* Order Summary */}
              <div className="bg-indigo-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{formData.customerName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Product:</span>
                    <span className="font-medium">{formData.productName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Metal:</span>
                    <span className="font-medium">
                      {formData.metal && formData.purity
                        ? `${formData.metal} ${formData.purity}`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{formData.weight ? `${formData.weight}g` : '-'}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-indigo-200 pt-2 mt-2">
                    <span>Total Amount:</span>
                    <span className="text-indigo-600">
                      ₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5" />
              Create Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
