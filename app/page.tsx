"use client";
import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  Fragment,
} from "react";
import Image from "next/image";
import SearchBox from "./search_box";
// import sift_logo from "../src-tauri/icons/sift_logo.png";
import { Menu, Transition, Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import GoogleIcon from "@mui/icons-material/Google";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { getClient, ResponseType } from "@tauri-apps/api/http";
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
import {
  IconBrandGithub,
  IconBrandNotion,
  IconBrandGoogle,
  IconBrandDiscordFilled,
} from "@tabler/icons-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Kbd } from "@nextui-org/kbd";
import { cn } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/tauri";
import { queryChroma, ChromaFile } from "@/lib/chromalib";

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
    abspath: "/Documents/random.txt",
    local: true,
    filecontent: "This is a sample document content...",
  },
  {
    id: 2,
    filename: "image.jpg",
    abspath: "https://example.com/image.jpg",
    local: true,
    filecontent: "https://example.com/image.jpg",
  },
];

const IntegrationCard = ({ logo: Logo, name, isAuthenticated, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="w-[50%] p-3 flex flex-grid rounded-lg dark:bg-[#1f1f1f] border border-1 hover:disabled:border border-bg-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out cursor-pointer"
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
  if (["pdf"].includes(ext)) return "pdf";
  return "text";
};

const FilePreview = ({ file }: { file: ChromaFile }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const fileType = getFileType(file.metadata.filepath); // Get file type based on file extension

    if (fileType === "image") {
      const dataUrl = `data:image/${file.metadata.filepath.split(".").pop()};base64,${file.document}`;
      setImageSrc(dataUrl);
    }
  }, [file]);

  const fileType = getFileType(file.metadata.filepath);

  // Image rendering
  if (fileType === "image" && imageSrc) {
    return <img src={imageSrc} alt={file.metadata.filepath} className="rounded-lg object-fit" />;
  }

  // PDF rendering in iframe
  if (fileType === "pdf") {
    // const pdfUrl = `data:application/pdf;base64,${file.document}`;
    return (
      <iframe
        src={`http://localhost:35438${file.metadata.filepath.replace("Users/ashwa/", "")}`}
        title={file.metadata.filepath}
        className="w-full h-full rounded-lg border border-orange-500"
        width={800}
        height={600}
      ></iframe>
    );
  }

  // Text-based file rendering (includes code and plain text)
  return (
    <div className="h-full w-full p-4 rounded-lg overflow-scroll">
      {fileType === "code" ? (
        <pre className="bg-gray-50 dark:bg-[#1f1f1f] rounded-lg">
          <code className="text-sm font-mono">{file.document}</code>
        </pre>
      ) : (
        <div className="bg-white dark:bg-[#1f1f1f] text-black dark:text-white whitespace-pre-wrap">
          {file.document}
        </div>
      )}
    </div>
  );
};





const FileExplorer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ChromaFile | null>(null);
  const [isIntegrationsDialogOpen, setIsIntegrationsDialogOpen] = useState(false);
  const fileTreeRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const [ghToken, setGhToken] = useState<string | null>(null);
  const [slackToken, setSlackToken] = useState<string | null>(null);
  const [discordToken, setDiscordToken] = useState<string | null>(null);
  const [notionToken, setNotionToken] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const [allfiles, setAllFiles] = useState<ChromaFile[]>([]);

  // Fetch real-time files based on search query
  useEffect(() => {
    const fetchFiles = async () => {
      const files = await queryChroma(searchQuery); // Ensure queryChroma fetches real-time results
      setAllFiles(files); // Store real-time results in allFiles state
    };

    fetchFiles();
  }, [searchQuery]);

  // Handle file selection
  const handleFileClick = useCallback(
    (file: ChromaFile, index: number) => {
      setSelectedResult(file); // Set selected file from real-time results
      setFocusedIndex(index);  // Update focused index for navigation
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : allfiles.length - 1;
          setSelectedResult(allfiles[newIndex]); // Automatically select the file when moving up
          return newIndex;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const newIndex = prev < allfiles.length - 1 ? prev + 1 : 0;
          setSelectedResult(allfiles[newIndex]); // Automatically select the file when moving down
          return newIndex;
        });
      }
    },
    [allfiles]
  );

  useEffect(() => {
    if (allfiles.length > 0 && !selectedResult) {
      setSelectedResult(allfiles[0]); // Automatically select first file if none selected
    }
  }, [allfiles, selectedResult]);

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
  };
  const handleGoogleOauth = async () => {
    invoke("ggl_oauth")
      .then((res) => {
        setGoogleToken(res as string);
      })
      .catch((err) => {
        setGoogleToken(err as string);
      });
  };

  return (
    <div className="h-screen flex flex-col dark:bg-[#1F1F1F]">
      {/* SETTINGS MODAL */}
      <div className="h-8 border-b border-zinc-700 flex justify-end items-center px-2">
        <Menu>
          <Menu.Button className="pl-2 rounded-lg hover:drop-shadow-xl focus:outline-none">
            <div className="flex items-center flex-row gap-x-0.75 p-1 rounded-md bg-white dark:bg-[#1f1f1f] hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150 ease-in-out">
              <Settings className="text-black dark:text-white" size={14} />
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
            <Menu.Items className="absolute space-y-1 right-2 mt-32 w-56 origin-top-right rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-[#1f1f1f] p-1 text-sm/6 text-gray-800 dark:text-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                    onClick={() => invoke("end_app")}
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
            <Dialog.Panel className="mx-auto rounded-xl w-[60%] bg-white dark:bg-[#1f1f1f] p-6 shadow-xl transition-all duration-150 ease-in-out">
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
                  logo={GoogleIcon}
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
        <ScrollArea
          className="w-64 p-2 focus:outline-none select-none"
          ref={fileTreeRef}
          onKeyDown={handleKeyDown} // Add keyboard navigation handler
          tabIndex="0"
        >
          <div className="space-y-2">
            {allfiles.map((file, index) => (
              <div
                key={file.id}
                className={`p-3 rounded-lg cursor-pointer ${
                  selectedResult?.id === file.id || focusedIndex === index
                    ? "bg-orange-500 text-black"
                    : "hover:bg-gray-100 text-black dark:text-white dark:hover:bg-white/10"
                } transition-colors duration-150 ease-in-out`}
                onClick={() => handleFileClick(file, index)}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFileType(file.metadata.filepath) === "image" ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : getFileType(file.metadata.filepath) === "code" ? (
                      <Code className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.metadata.filepath.split("/").pop()}
                    </p>
                    <p className="text-sm truncate">{file.metadata.filepath}</p>
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
                <h2 className="text-xl font-bold mb-2 dark:text-white text-black">
                  {selectedResult.metadata.filepath.split("/").pop()}
                </h2>
                <div className="bg-white dark:bg-[#1f1f1f] p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Path:</strong> {selectedResult.metadata.filepath}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-white dark:bg-[#1f1f1f] border border-orange-500 rounded-lg shadow-sm">
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

      {/* Search bar */}
      <div className="relative dark:border-muted-foreground">
        <div className="h-12 flex px-1.5 items-center gap-2">
          <SearchBox onSearch={(query) => setSearchQuery(query)} />
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
