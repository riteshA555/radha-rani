
import React from 'react';
import clsx from 'clsx';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
    title: string | React.ReactNode;
    subtitle?: string;
    actions?: React.ReactNode;
    showBack?: boolean;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, showBack, className }) => {
    const navigate = useNavigate();

    return (
        <div className={clsx("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6", className)}>
            <div className="flex items-center gap-3">
                {showBack && (
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">{title}</h2>
                    {subtitle && (
                        <p className="text-sm text-gray-600 mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
};
