"use client";
import React, { useState, useEffect, Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Command, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const mockFiles = [
  {
    id: 1,
    name: "documents",
    type: "directory",
    children: [
      { id: 2, name: "report.pdf", type: "pdf" },
      { id: 3, name: "notes.md", type: "markdown" },
    ],
  },
  {
    id: 4,
    name: "images",
    type: "directory",
    children: [{ id: 5, name: "photo.jpg", type: "image" }],
  },
];

const FileExplorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Handle system theme changes
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("dark");

  const getFileActions = (fileType) => {
    const commonActions = [
      { id: "copy", label: "Copy", shortcut: "⌘C" },
      { id: "delete", label: "Delete", shortcut: "⌘⌫" },
    ];

    const typeSpecificActions = {
      pdf: [
        { id: "open", label: "Open in PDF viewer", shortcut: "⌘O" },
        { id: "extract", label: "Extract Text", shortcut: "⌘E" },
      ],
      markdown: [
        { id: "preview", label: "Toggle Preview", shortcut: "⌘P" },
        { id: "export", label: "Export as PDF", shortcut: "⌘⇧E" },
      ],
      // Add more file type specific actions
    };

    return [...commonActions, ...(typeSpecificActions[fileType] || [])];
  };

  useEffect(() => {
    // Set initial theme
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    // Listen for theme changes
    const handler = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev); // Toggle menu
      }
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  // Handle menu option selection
  const handleMenuAction = (action: string) => {
    // Handle the action
    console.log(`Executing action: ${action}`);
    // Close the menu
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-muted text-black dark:text-white">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree view */}
        <ScrollArea className="w-64 border-r p-2 dark:border-muted-foreground border-zinc-200">
          <FileTree
            files={mockFiles}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </ScrollArea>

        {/* File preview area */}
        <div className="flex-1 p-4">
          {selectedFile && (
            <div className="text-sm">
              <h2 className="font-medium">{selectedFile.name}</h2>
              <p
                className={
                  systemTheme === "dark" ? "text-zinc-400" : "text-zinc-600"
                }
              >
                Type: {selectedFile.type}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div
        className={cn(
          "relative border-t",
          systemTheme === "dark" ? "border-zinc-700" : "border-zinc-200",
        )}
      >
        {/* Command Palette */}
        <Menu as="div" className="absolute right-4 bottom-full mb-2">
          <Transition
            show={isCommandPaletteOpen}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              static
              className={cn(
                "w-[280px] origin-bottom rounded-lg border p-1 text-sm shadow-lg focus:outline-none",
                systemTheme === "dark"
                  ? "bg-zinc-800 border-zinc-700 text-white"
                  : "bg-white border-zinc-200 text-zinc-900",
              )}
            >
              <div className="px-3 py-2 text-xs font-medium opacity-50">
                Actions for {selectedFile?.name}
              </div>
              {selectedFile &&
                getFileActions(selectedFile.type).map((action) => (
                  <Menu.Item key={action.id}>
                    {({ active }) => (
                      <button
                        className={`group flex w-full items-center gap-2 rounded-lg py-1.5 px-3 ${
                          active ? "bg-gray-100 dark:bg-white/10" : ""
                        } hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out`}
                        onClick={() => handleMenuAction(action.id)}
                      >
                        <span className="flex-1">{action.label}</span>
                        <kbd
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] font-medium rounded border",
                            systemTheme === "dark"
                              ? "bg-zinc-700 border-zinc-600 text-zinc-400"
                              : "bg-zinc-100 border-zinc-200 text-zinc-500",
                          )}
                        >
                          {action.shortcut}
                        </kbd>
                      </button>
                    )}
                  </Menu.Item>
                ))}
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Action shortcuts bar */}
        {/* <div className="h-8 px-4 flex items-center space-x-4 text-xs">
          {["Open", "Copy", "Delete"].map((action, i) => (
            <span key={action} className="flex items-center gap-2">
              <kbd
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-medium rounded border",
                  systemTheme === "dark"
                    ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                    : "bg-zinc-100 border-zinc-200 text-zinc-500",
                )}
              >
                {["⌘↵", "⌘C", "⌘⌫"][i]}
              </kbd>
              <span
                className={
                  systemTheme === "dark" ? "text-zinc-400" : "text-zinc-600"
                }
              >
                {action}
              </span>
            </span>
          ))}
        </div> */}

        {/* Search bar */}
        <div
          className={cn(
            "h-12 px-4 border-t flex items-center gap-2",
            systemTheme === "dark" ? "border-zinc-700" : "border-zinc-200",
          )}
        >
          <div className="relative flex-1">
            <Search
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                systemTheme === "dark" ? "text-zinc-400" : "text-zinc-500",
              )}
            />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-9",
                systemTheme === "dark"
                  ? "bg-zinc-800 border-zinc-700"
                  : "bg-zinc-50 border-zinc-200",
              )}
            />
          </div>
          <kbd
            className={cn(
              "px-1.5 py-0.5 text-[10px] font-medium rounded border",
              systemTheme === "dark"
                ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                : "bg-zinc-100 border-zinc-200 text-zinc-500",
            )}
          >
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  );
};

const FileTree = ({ files, onFileSelect, selectedFile }) => {
  return (
    <div className="space-y-1">
      {files.map((file) => (
        <FileTreeItem
          key={file.id}
          file={file}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  );
};

// FileTreeItem component
const FileTreeItem = ({ file, onFileSelect, selectedFile, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      <button
        className={cn(
          "w-full text-left px-2 py-1 text-sm rounded flex items-center",
          selectedFile?.id === file.id && "bg-gray-100",
          "hover:bg-gray-100 dark:hover:bg-white/10",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          onFileSelect(file);
          if (file.type === "directory") {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {file.type === "directory" && (
          <span className="mr-2">{isExpanded ? "▾" : "▸"}</span>
        )}
        {file.name}
      </button>

      {isExpanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.id}
              file={child}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
