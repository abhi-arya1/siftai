"use client";
import React, { useState, useEffect, Fragment } from "react";
import Image from "next/image";
// import sift_logo from "../src-tauri/icons/sift_logo.png";
import { Menu, Transition, Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { getClient, ResponseType } from '@tauri-apps/api/http';
import {
  Command,
  Search,
  Settings,
  Slack,
  CheckIcon,
  ArrowUpRight,
  ArrowDown,
  MoveUpRight,
  Zap,
  XIcon,
  Code,
  FileText,
  ImageIcon,
} from "lucide-react";
import { IconBrandGithub, IconBrandNotion, IconBrandGoogle, IconBrandDiscordFilled } from "@tabler/icons-react";
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
    filename: "random.txt",
    abspath: "/Users/ashwa/Documents/random.txt",
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

const getFileType = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext)) return "image";
  if (["js", "ts", "py", "java", "cpp", "html", "css"].includes(ext))
    return "code";
  return "text";
};

const FilePreview = ({ file }: { file: SearchResultItem }) => {
  const [content, setContent] = useState<any | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      const sanitizedPath = "/Documents/random.txt";
      const fileType = getFileType(file.filename);
      
      console.log(file.filename);

      const client = await getClient();

      if (fileType === "image") {
        // Fetch binary content for images
        const response = await client.get(`http://localhost:35438/Desktop/IMG_0776.png`, {
          responseType: ResponseType.Binary,
        });
        console.log(response.data)
        const blob = new Blob([response.data as any], { type: "image/png" });
        const asset = URL.createObjectURL(blob);
        console.log(asset)
        setImageSrc(asset);
      } else {
        // Fetch text-based files
        const response = await client.get(`http://localhost:35438/Documents/random.txt`, {
          responseType: ResponseType.Text,
        });
        console.log(response.data)
        setContent(response.data as any);
      }
    };

    fetchContent();
  }, [file]);

  if (error) {
    return <div>Error loading file: {error}</div>;
  }

  const fileType = getFileType(file.filename);

  return (
    <div className="h-full overflow-auto p-4">
      {fileType === "image" ? (
        <div className="relative w-full h-full min-h-[300px]">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={file.filename}
              className="object-contain w-full h-full"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
      ) : fileType === "code" ? (
        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
          <code className="text-sm font-mono">{content}</code>
        </pre>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
};

const FileExplorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResultItem | null>(
    null,
  );
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] = useState(false);
  const [ghToken, setGhToken] = useState<string | null>(null);
  const [slackToken, setSlackToken] = useState<string | null>(null);
  const [discordToken, setDiscordToken] = useState<string | null>(null);
  const [notionToken, setNotionToken] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
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
  
  const handleNotionOauth = async () => {
    invoke("ntn_oauth")
      .then((res) => {
        setNotionToken(res as string);
      })
      .catch((err) => {
        setNotionToken(err as string);
      });
  }

  const handleGoogleOauth = async () => {
    invoke("ggl_oauth")
      .then((res) => {
        setGoogleToken(res as string);
      })
      .catch((err) => {
        setGoogleToken(err as string);
      });
  }

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
              {/* <Image src={sift_logo} alt="settings" className="w-5 h-5" /> */}
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
                  logo={IconBrandGithub}
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
                  logo={IconBrandNotion}
                  name="Notion"
                  isAuthenticated={!!notionToken}
                  onClick={handleNotionOauth}
                />
                <IntegrationCard
                  logo={IconBrandDiscordFilled}
                  name="Discord"
                  isAuthenticated={!!discordToken}
                  onClick={handleDiscordOauth}
                />
                <IntegrationCard
                  logo={IconBrandGoogle}
                  name="Google"
                  isAuthenticated={!!googleToken}
                  onClick={handleGoogleOauth}
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
              <div
                key={result.id}
                className={`p-3 rounded-lg cursor-pointer ${
                  selectedResult?.id === result.id
                    ? "bg-orange-300 dark:bg-orange-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                } transition-colors duration-150 ease-in-out`}
                onClick={() => setSelectedResult(result)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFileType(result.filename) === "image" ? (
                      <ImageIcon className="w-5 h-5 text-purple-500" />
                    ) : getFileType(result.filename) === "code" ? (
                      <Code className="w-5 h-5 text-blue-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-gray-500" />
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
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* File preview area */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          {selectedResult ? (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">
                  {selectedResult.filename}
                </h2>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Path:</strong> {selectedResult.abspath}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Type:</strong>{" "}
                    {getFileType(selectedResult.filename)}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <FilePreview file={selectedResult} />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p>Select a file to view details</p>
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

export default FileExplorer;
