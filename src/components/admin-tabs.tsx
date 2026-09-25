"use client";

import { KeyboardEvent, ReactNode } from "react";

import { Icon, type IconName } from "./icons";

export type AdminTabId = "setup" | "room" | "calls" | "results";
export type AdminGameStatus = "waiting" | "playing" | "completed";

type AdminTab = { id: AdminTabId; label: string; disabled: boolean };

const tabIcons: Record<AdminTabId, IconName> = {
  calls: "radio",
  results: "trophy",
  room: "users",
  setup: "sliders",
};

type AdminTabsProps = {
  activeTab: AdminTabId;
  children: Record<AdminTabId, ReactNode>;
  onTabChange: (tab: AdminTabId) => void;
  status: AdminGameStatus | null;
};

export function getAdminTabs(status: AdminGameStatus | null): AdminTab[] {
  return [
    { id: "setup", label: "Preparar", disabled: false },
    { id: "room", label: "Sala", disabled: status === null },
    { id: "calls", label: "Anunciar", disabled: status !== "playing" && status !== "completed" },
    { id: "results", label: "Resultados", disabled: status !== "completed" },
  ];
}

export function AdminTabs({ activeTab, children, onTabChange, status }: AdminTabsProps) {
  const tabs = getAdminTabs(status);

  function selectTab(tabId: AdminTabId) {
    onTabChange(tabId);
    window.setTimeout(() => document.getElementById(`admin-tab-${tabId}`)?.focus(), 0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentIndex = enabledTabs.findIndex((tab) => tab.id === activeTab);
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? enabledTabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + enabledTabs.length) % enabledTabs.length;
    selectTab(enabledTabs[nextIndex].id);
  }

  return <div className="admin-tabs">
    <div aria-label="Secciones de administración" className="admin-tablist" role="tablist">
      {tabs.map((tab) => <button
        aria-controls={`admin-panel-${tab.id}`}
        aria-selected={activeTab === tab.id}
        className="admin-tab"
        disabled={tab.disabled}
        id={`admin-tab-${tab.id}`}
        key={tab.id}
        onClick={() => selectTab(tab.id)}
        onKeyDown={onKeyDown}
        role="tab"
        tabIndex={activeTab === tab.id ? 0 : -1}
        type="button"
      ><Icon name={tabIcons[tab.id]} /><span>{tab.label}</span></button>)}
    </div>
    <div aria-labelledby={`admin-tab-${activeTab}`} className="admin-tabpanel" id={`admin-panel-${activeTab}`} role="tabpanel" tabIndex={0}>
      {children[activeTab]}
    </div>
  </div>;
}
