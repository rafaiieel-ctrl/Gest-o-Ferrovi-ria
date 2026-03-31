import React, { useState } from 'react';
import { Card } from '../ui/Card';

interface Tab {
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
}

interface SidebarTabsProps {
    tabs: Tab[];
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="lg:sticky top-24 self-start">
            <Card padding="md">
                <div className="border-b border-border mb-4">
                    <nav className="-mb-px flex gap-4" aria-label="Tabs">
                        {tabs.map((tab, index) => (
                            <button
                                key={tab.title}
                                onClick={() => setActiveTab(index)}
                                className={`
                                    flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                    ${activeTab === index
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                    }
                                `}
                            >
                                {tab.icon}
                                <span>{tab.title}</span>
                            </button>
                        ))}
                    </nav>
                </div>
                <div>
                    {tabs[activeTab].content}
                </div>
            </Card>
        </div>
    );
};