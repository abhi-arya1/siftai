"use client";

import { useState, useEffect, Fragment } from "react";
import {
  Command,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Search,
  Download,
  Share2,
  Terminal,
  Copy,
  Trash2,
  Edit,
  ArrowRight,
} from "lucide-react";
import { Menu, Transition, Dialog } from "@headlessui/react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { invoke } from "@tauri-apps/api/tauri";

const SAMPLE_FILES = [
  {
    id: 1,
    name: "Documents",
    type: "directory",
    modified: "2024-03-15",
    children: [
      { id: 2, name: "project-notes.md", type: "file", modified: "2024-03-14" },
      { id: 3, name: "research.txt", type: "file", modified: "2024-03-13" },
    ],
  },
  {
    id: 4,
    name: "Source Code",
    type: "directory",
    modified: "2024-03-15",
    children: [
      { id: 5, name: "main.rs", type: "file", modified: "2024-03-15" },
      {
        id: 6,
        name: "utils",
        type: "directory",
        modified: "2024-03-12",
        children: [
          { id: 7, name: "helpers.rs", type: "file", modified: "2024-03-12" },
        ],
      },
    ],
  },
];

const SHORTCUTS = [
  { key: "⌘ + O", action: "Open file" },
  { key: "⌘ + F", action: "Search" },
  { key: "→", action: "Expand" },
  { key: "←", action: "Collapse" },
];

const getAvailableActions = (selectedFile) => {
  if (!selectedFile) return [];

  const commonActions = [
    {
      id: "rename",
      name: "Rename",
      shortcut: "⌘ R",
      icon: Edit,
      group: "Actions",
      action: () => console.log("Rename", selectedFile.name),
    },
    {
      id: "copy-path",
      name: "Copy Path",
      shortcut: "⌘ C",
      icon: Copy,
      group: "Actions",
      action: () => console.log("Copy path", selectedFile.name),
    },
    {
      id: "delete",
      name: "Delete",
      shortcut: "⌘ ⌫",
      icon: Trash2,
      group: "Actions",
      action: () => console.log("Delete", selectedFile.name),
      danger: true,
    },
  ];

  if (selectedFile.type === "directory") {
    return [
      {
        id: "open",
        name: "Open Folder",
        shortcut: "⌘ O",
        icon: Folder,
        group: "Quick Actions",
        action: () => console.log("Open folder", selectedFile.name),
      },
      {
        id: "terminal",
        name: "Open in Terminal",
        shortcut: "⌘ T",
        icon: Terminal,
        group: "Quick Actions",
        action: () => console.log("Open terminal", selectedFile.name),
      },
      ...commonActions,
    ];
  }

  return [
    {
      id: "open",
      name: "Open File",
      shortcut: "⌘ O",
      icon: File,
      group: "Quick Actions",
      action: () => console.log("Open file", selectedFile.name),
    },
    {
      id: "download",
      name: "Download",
      shortcut: "⌘ D",
      icon: Download,
      group: "Quick Actions",
      action: () => console.log("Download", selectedFile.name),
    },
    {
      id: "share",
      name: "Share",
      shortcut: "⌘ S",
      icon: Share2,
      group: "Quick Actions",
      action: () => console.log("Share", selectedFile.name),
    },
    ...commonActions,
  ];
};

export default function FileExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState(new Set([1, 4]));
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  const [token, setToken] = useState("");

  async function handleGitHubLogin() {
    try {
      const accessToken = await invoke('start_github_oauth');
  
      setToken(accessToken as string);
      
    } catch (error) {
      setToken(`Error during GitHub OAuth: ${error}`);
    }
  }
  

  // Get available actions based on current context
  const availableActions = getAvailableActions(selectedFile);

  // Filter actions based on search
  const filteredActions = availableActions.filter((action) =>
    action.name.toLowerCase().includes(commandFilter.toLowerCase()),
  );

  // Group actions
  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.group]) {
      acc[action.group] = [];
    }
    acc[action.group].push(action);
    return acc;
  }, {});

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandMenuOpen(true);
      }
      if (e.key === "Escape") {
        setIsCommandMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const FileContextMenu = ({ file }) => (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <Menu.Button className="hidden group-hover:block absolute right-2 top-1/2 -translate-y-1/2">
            <div className="p-1 hover:bg-zinc-700 rounded">
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </div>
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Menu.Items className="absolute left-full ml-1 w-56 origin-top-right rounded-md bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? "bg-zinc-700" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm text-zinc-200`}
                    >
                      Open
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? "bg-zinc-700" : ""
                      } group flex w-full items-center rounded-md px-2 py-2 text-sm text-zinc-200`}
                    >
                      Rename
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );

  const renderFileTree = (items, depth = 0) => {
    return items.map((item) => (
      <div key={item.id} className="w-full">
        <div
          className={`
            group relative flex items-center px-4 py-2 cursor-pointer
            transition-colors duration-100
            ${selectedFile === item.id ? "bg-zinc-700/50" : "hover:bg-zinc-800/50"}
            ${depth === 0 ? "border-t border-zinc-800" : ""}
          `}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
          onClick={() => {
            setSelectedFile(item.id);
            if (item.type === "directory") toggleDirectory(item.id);
          }}
        >
          <div className="flex items-center flex-1 min-w-0">
            <div className="mr-2 text-zinc-400">
              {item.type === "directory" ? (
                expandedDirs.has(item.id) ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )
              ) : (
                <File className="h-4 w-4" />
              )}
            </div>
            <span className="text-sm text-zinc-200 truncate">{item.name}</span>
            <span className="ml-2 text-xs text-zinc-500 truncate">
              {new Date(item.modified).toLocaleDateString()}
            </span>
          </div>
          <FileContextMenu file={item} />
        </div>
        {item.type === "directory" &&
          expandedDirs.has(item.id) &&
          item.children && (
            <div className="border-l border-zinc-800 ml-[20px]">
              {renderFileTree(item.children, depth + 1)}
            </div>
          )}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-white">
      {/* Top Bar */}
      <div className="h-12 border-b border-zinc-800 flex items-center px-4 bg-zinc-900/90 backdrop-blur-sm">
        <h1 className="text-sm font-medium text-zinc-200">File Explorer</h1>
        <button onClick={handleGitHubLogin}>Login with GitHub</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="py-2">{renderFileTree(SAMPLE_FILES)}</div>
        </ScrollArea>
      </div>

      <div className="relative h-8 border-t border-white/[0.08] flex items-center px-4 justify-between bg-black/20">
        <Menu as="div" className="relative">
          {({ open }) => (
            <>
              <Menu.Button
                className="flex items-center space-x-2 text-white/40 focus:outline-none"
                onClick={() => setIsCommandMenuOpen(true)}
              >
                <span className="text-xs">Press</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/80 shadow-sm backdrop-blur-sm text-xs">
                  ⌘ K
                </kbd>
                <span className="text-xs">for actions</span>
              </Menu.Button>

              <Transition
                show={open || isCommandMenuOpen}
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
                afterLeave={() => setCommandFilter("")}
              >
                <Menu.Items
                  static
                  className="absolute bottom-full mb-2 w-[480px] rounded-lg bg-black/40 backdrop-blur-xl shadow-lg ring-1 ring-white/10 focus:outline-none overflow-hidden"
                >
                  <div className="p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-white/40" />
                      <input
                        type="text"
                        className="w-full h-9 bg-white/5 rounded-md pl-8 pr-4 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/10"
                        placeholder="Search actions..."
                        value={commandFilter}
                        onChange={(e) => setCommandFilter(e.target.value)}
                      />
                    </div>

                    <div className="mt-2 max-h-[300px] overflow-y-auto">
                      {Object.entries(groupedActions).map(
                        ([group, actions]) => (
                          <div key={group}>
                            <div className="px-2 py-1 text-xs text-white/40">
                              {group}
                            </div>
                            {actions.map((action) => (
                              <Menu.Item key={action.id}>
                                {({ active }) => (
                                  <button
                                    className={`
                                          w-full text-left px-2 py-1.5 rounded-md flex items-center space-x-3 text-sm
                                          ${active ? "bg-white/10" : ""}
                                          ${action.danger ? "text-red-400" : "text-white/90"}
                                        `}
                                    onClick={() => {
                                      action.action();
                                      setIsCommandMenuOpen(false);
                                    }}
                                  >
                                    <action.icon className="h-4 w-4 flex-shrink-0" />
                                    <span className="flex-1">
                                      {action.name}
                                    </span>
                                    <kbd className="px-1.5 py-0.5 text-xs text-white/40 bg-white/5 rounded">
                                      {action.shortcut}
                                    </kbd>
                                  </button>
                                )}
                              </Menu.Item>
                            ))}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </Menu.Items>
              </Transition>
            </>
          )}
        </Menu>

        {selectedFile && (
          <div className="flex items-center space-x-2 text-xs text-white/40">
            <span>{selectedFile.name}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{selectedFile.type}</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="h-12 border-t border-zinc-800 p-2 bg-zinc-900/90 backdrop-blur-sm">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>
      </div>
    </div>
  );
}
