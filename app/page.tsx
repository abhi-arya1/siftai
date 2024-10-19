"use client";
import React, { useState, useEffect, Fragment } from "react";
import Image from "next/image";
// import sift_logo from "../src-tauri/icons/sift_logo.png";
import { Menu, Transition, Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';

import {
  Command,
  Search,
  Settings,
  Github,
  Slack,
  CheckIcon,
  ArrowUpRight,
  ArrowDown,
  MoveUpRight,
  Zap,
  XIcon,
  Images,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Kbd } from "@nextui-org/kbd";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/tauri";

type SearchResultItem = {
  id: number;
  filename: string;
  abspath: string;
  local: boolean;
  filecontent: string;
};

const mockResults: SearchResultItem[] = [
  {
    id: 1,
    filename: "document.txt",
    abspath: "/path/to/document.txt",
    local: true,
    filecontent: "This is a sample document content...",
  },
  {
    id: 2,
    filename: "image.jpg",
    abspath: "https://example.com/image.jpg",
    local: false,
    filecontent: "https://example.com/image.jpg",
  },
];

const IntegrationCard = ({ logo: Logo, name, isAuthenticated, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="w-[50%] p-3 flex flex-grid rounded-lg dark:bg-muted hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-x-2">
        <Logo className="text-black dark:text-white" />
        <span className="dark:text-white">{name}</span>
      </div>
      {isAuthenticated ? (
        <CheckIcon className="pl-2 text-green-500" />
      ) : isHovered ? (
        <MoveUpRight className="pl-1 ml-auto text-gray-500 transition-all duration-300 hover:scale-110 ease-in-out" />
      ) : (
        <ArrowUpRight className="pl-1 ml-auto text-gray-500 transition-all duration-300 hover:scale-110 ease-in-out" />
      )}
    </div>
  );
};

const fileTypeActions = {
  txt: [
    { id: "open", label: "Open", shortcut: "⌘O" },
    { id: "edit", label: "Edit", shortcut: "⌘E" },
    { id: "copy", label: "Copy", shortcut: "⌘C" },
    { id: "delete", label: "Delete", shortcut: "⌘⌫" },
  ],
  jpg: [
    { id: "view", label: "View", shortcut: "⌘V" },
    { id: "download", label: "Download", shortcut: "⌘D" },
    { id: "share", label: "Share", shortcut: "⌘S" },
    { id: "delete", label: "Delete", shortcut: "⌘⌫" },
  ],
  py: [
    { id: "run", label: "Run", shortcut: "⌘R" },
    { id: "edit", label: "Edit", shortcut: "⌘E" },
    { id: "debug", label: "Debug", shortcut: "⌘D" },
    { id: "copy", label: "Copy", shortcut: "⌘C" },
  ],
  default: [
    { id: "open", label: "Open", shortcut: "⌘O" },
    { id: "copy", label: "Copy", shortcut: "⌘C" },
    { id: "delete", label: "Delete", shortcut: "⌘⌫" },
  ],
};

const FileExplorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResultItem | null>(
    null,
  );
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] =
    useState(false);
  const [ghToken, setGhToken] = useState<string | null>(null);
  const [slackToken, setSlackToken] = useState<string | null>(null);
  const [discordToken, setDiscordToken] = useState<string | null>(null);
  // const invoke = window.__TAURI__.invoke;

  useEffect(() => {
    if (mockResults.length > 0 && !selectedResult) {
      setSelectedResult(mockResults[0]);
    }
  }, []);

  const handleGitHubOauth = async () => {
    invoke("gh_oauth")
      .then((res) => {
        setGhToken(res as string);
      })
      .catch((err) => {
        setGhToken(err as string);
      });
  };

  const handleSlackOauth = async () => {
    invoke("slk_oauth")
      .then((res) => {
        setSlackToken(res as string);
      })
      .catch((err) => {
        setSlackToken(err as string);
      });
  };

  const handleDiscordOauth = async () => {
    invoke("disc_oauth")
      .then((res) => {
        setDiscordToken(res as string);
      })
      .catch((err) => {
        setDiscordToken(err as string);
      });
  };

  const [files, setFiles] = useState<string | null>(null); // Declare state to hold the files

  const getGitHubFiles = async (s: String) => {
    try {
      const result = await invoke("gh_find", { access_token: s }); // Ensure the correct parameter structure
      console.log("Files retrieved:", result);
      setFiles("hello"); // Update state with the result
    } catch (error) {
      console.error("Error fetching GitHub files:", error);
      // Optionally handle the error here (e.g., set an error state)
    }
  };

  const handleFetchFiles = () => {
    const param = ""; // Set your parameter value here
    getGitHubFiles(param);
  };

  const getFileActions = (fileType: any) => {
    const commonActions = [
      { id: "copy", label: "Copy", shortcut: "⌘ C" },
      { id: "delete", label: "Delete", shortcut: "⌘ ⌫" },
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
    };

    return [
      ...commonActions,
      ...(typeSpecificActions[fileType as keyof typeof typeSpecificActions] ||
        []),
    ];
  };

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, []);

  const handleMenuAction = (action: string) => {
    console.log(`Executing action: ${action}`);
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-muted text-black dark:text-white">
      {/* SETTINGS MODAL */}
      <div className="h-8 border-b border-zinc-700 flex justify-end items-center px-2">
        <Menu>
          <Menu.Button className="pl-2 rounded-lg hover:drop-shadow-xl focus:outline-none">
            <div className="flex items-center flex-row gap-x-0.75 p-1 rounded-md bg-white dark:bg-muted hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out">
              <Settings size={14} />
              { /* <Image src={sift_logo} alt="settings" className="w-5 h-5" /> */ } 
            </div>
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute space-y-1 right-2 mt-32 w-56 origin-top-right rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-muted p-1 text-sm/6 text-gray-800 dark:text-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`group flex w-full items-center gap-2 rounded-lg py-1.5 px-3 ${
                      active ? "bg-gray-100 dark:bg-white/10" : ""
                    } hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out`}
                    onClick={() => setIsIntegrationsDialogOpen(true)}
                  >
                    Integrations
                    <Zap size={16} className="ml-auto text-yellow-400" />
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`group flex w-full items-center gap-2 rounded-lg py-1.5 px-3 text-red-500 ${
                      active ? "bg-gray-100 dark:bg-white/10" : ""
                    } hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out`}
                    // onClick={() => invoke("exit-app")}
                  >
                    Quit Sift
                    <XIcon size={16} className="ml-auto text-red-500" />
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>

        <Dialog
          open={isIntegrationsDialogOpen}
          onClose={() => setIsIntegrationsDialogOpen(false)}
          className="relative z-50 transition-all duration-150 ease-in-out"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4 transition-all duration-150 ease-in-out">
            <Dialog.Panel className="mx-auto rounded-xl w-[40%] bg-white dark:bg-muted p-6 shadow-xl transition-all duration-150 ease-in-out">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-lg font-medium dark:text-white">
                  Integrations
                </Dialog.Title>
                <button
                  onClick={() => setIsIntegrationsDialogOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XIcon size={20} />
                </button>
              </div>

              <div className="space-y-2">
                <IntegrationCard
                  logo={Github}
                  name="GitHub"
                  isAuthenticated={!!ghToken}
                  onClick={handleGitHubOauth}
                />
                <IntegrationCard
                  logo={Slack}
                  name="Slack"
                  isAuthenticated={!!slackToken}
                  onClick={handleSlackOauth}
                />
                <IntegrationCard
                  logo={() => <FontAwesomeIcon icon={faDiscord} />}
                  name="Discord"
                  isAuthenticated={!!discordToken}
                  onClick={handleDiscordOauth}
                />
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree view */}
        <ScrollArea className="w-64 p-2">
          <div className="space-y-2">
            {mockResults.map((result) => (
              <motion.div
                key={result.id}
                className={`p-3 rounded-lg cursor-pointer ${
                  selectedResult?.id === result.id
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => setSelectedResult(result)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {result.local ? (
                      <svg
                        className="w-6 h-6 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-6 h-6 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.filename}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {result.abspath}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        {/* File preview area */}
        <div className="flex-1 p-4">
          {selectedResult ? (
            <div>
              <h2 className="text-xl font-bold mb-4">
                {selectedResult.filename}
              </h2>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  Metadata and Details
                </h3>
                <p>
                  <strong>Path:</strong> {selectedResult.abspath}
                </p>
                <p>
                  <strong>Local File:</strong>{" "}
                  {selectedResult.local ? "Yes" : "No"}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">File Content</h3>
                <p className="whitespace-pre-wrap">
                  {selectedResult.filecontent}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Select a result to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="relative dark:border-muted-foreground">
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
              className="w-[280px] origin-bottom rounded-lg border p-1 text-sm items-center shadow-lg border border-gray-200 dark:border-white/5 focus:outline-none dark:bg-muted bg-white dark:text-white text-zinc-900"
            >
              <div className="px-3 py-2 text-xs font-medium opacity-50">
                Actions for {selectedResult?.filename || "selected file"}
              </div>
              {selectedResult &&
                getFileActions(selectedResult.type).map((action) => (
                  <Menu.Item key={action.id}>
                    {({ active }) => (
                      <button
                        className={`tracking-wide group flex w-full justify-between gap-2 items-center rounded-lg py-1.5 px-3 ${
                          active ? "bg-gray-100 dark:bg-white/10" : ""
                        } hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out`}
                        onClick={() => handleMenuAction(action.id)}
                      >
                        <span className="select-none justify-start">
                          {action.label}
                        </span>
                        <kbd className="px-1.5 py-0.5 text-[12px] font-medium rounded border dark:bg-muted dark:border-muted-foreground dark:text-white bg-zinc-100 border-zinc-200 text-zinc-500">
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
        <div className="h-8 select-none px-4 flex items-center justify-end space-x-4 text-xs">
          {["Actions"].map((action, i) => (
            <span
              key={action}
              className="select-none flex items-center justify-end gap-2"
            >
              <span className="select-none dark:text-zinc-400 text-zinc-600">
                {action}
              </span>
              <kbd className="select-none px-1.5 py-0.5 text-[12px] font-medium rounded border dark:bg-muted dark:border-muted-foreground dark:text-white text-zinc-400">
                {["⌘ K"][i]}
              </kbd>
            </span>
          ))}
        </div>

        {/* Search bar */}
        {/* <button onClick={handleFetchFiles}>
          Hello World
          <div>{files}</div>
        </button> */}
        <div className="h-12 border-t flex px-1.5 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 dark:bg-zinc-800 dark:border-zinc-700 bg-zinc-50 border-zinc-200 rounded-lg text-zinc-500 dark:text-zinc-400 focus:ring-0 focus:border-zinc-200 dark:focus:border-zinc-700"
            />
          </div>
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
          "w-full text-left px-2 py-1 text-sm rounded flex items-center transition-colors duration-150 ease-in-out",
          selectedFile?.id === file.id && "bg-gray-100 dark:bg-white/10",
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
