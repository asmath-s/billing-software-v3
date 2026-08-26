import { useEffect, useRef, useState } from "react";

const COLOR_PALETTE = [
  "#000000",
  "#374151",
  "#1E40AF",
  "#0B6BCB",
  "#047857",
  "#B45309",
  "#DC2626",
  "#7C3AED",
  "#DB2777",
];

const HIGHLIGHT_PALETTE = [
  "transparent",
  "#FEF08A",
  "#BAE6FD",
  "#BBF7D0",
  "#FED7AA",
  "#FBCFE8",
  "#E9D5FF",
];

const RichTextEditor = ({
  value = "",
  onChange,
  placeholder = "Type your text here...",
  minHeight = "120px",
  label = "",
}) => {
  const editorRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});

  // Sync incoming value to contentEditable div without losing cursor if already matching
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const updateActiveFormats = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        justifyFull: document.queryCommandState("justifyFull"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // ignore
    }
  };

  const exec = (command, val = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    triggerChange();
    updateActiveFormats();
  };

  const triggerChange = () => {
    if (editorRef.current && onChange) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handleKeyDown = (e) => {
    // When Enter is pressed, ensure <p> or <br> behavior
    if (e.key === "Enter") {
      updateActiveFormats();
    }
  };

  return (
    <div className="border border-[#E0E1E3] rounded-lg bg-white overflow-hidden shadow-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
      {label && (
        <div className="px-3.5 py-2 bg-gray-50 border-b border-[#E0E1E3] flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
            {label}
          </span>
          <span className="text-[11px] text-gray-400">Rich Text Formatter</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#F8FAFC] border-b border-[#E0E1E3] text-sm select-none">
        {/* Style / Size */}
        <select
          onChange={(e) => {
            const val = e.target.value;
            if (val === "p") {
              exec("formatBlock", "<p>");
            } else if (val.startsWith("h")) {
              exec("formatBlock", `<${val}>`);
            }
            e.target.value = "normal";
          }}
          defaultValue="normal"
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 hover:border-gray-400 focus:outline-hidden"
          title="Heading / Format"
        >
          <option value="normal" disabled>
            Font Style
          </option>
          <option value="p">Normal Text (P)</option>
          <option value="h1">Heading 1 (H1)</option>
          <option value="h2">Heading 2 (H2)</option>
          <option value="h3">Heading 3 (H3)</option>
          <option value="h4">Heading 4 (H4)</option>
        </select>

        {/* Font Size */}
        <select
          onChange={(e) => {
            exec("fontSize", e.target.value);
            e.target.value = "size";
          }}
          defaultValue="size"
          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 hover:border-gray-400 focus:outline-hidden"
          title="Font Size"
        >
          <option value="size" disabled>
            Size
          </option>
          <option value="2">Small (12px)</option>
          <option value="3">Regular (14px)</option>
          <option value="4">Medium (16px)</option>
          <option value="5">Large (18px)</option>
          <option value="6">Extra Large (24px)</option>
        </select>

        <div className="w-px h-5 bg-gray-300 mx-0.5" />

        {/* Basic formatting */}
        <button
          type="button"
          onClick={() => exec("bold")}
          className={`px-2 py-1 rounded font-bold text-xs cursor-pointer ${
            activeFormats.bold
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>

        <button
          type="button"
          onClick={() => exec("italic")}
          className={`px-2 py-1 rounded italic text-xs cursor-pointer ${
            activeFormats.italic
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>

        <button
          type="button"
          onClick={() => exec("underline")}
          className={`px-2 py-1 rounded underline text-xs cursor-pointer ${
            activeFormats.underline
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        <button
          type="button"
          onClick={() => exec("strikeThrough")}
          className={`px-2 py-1 rounded line-through text-xs cursor-pointer ${
            activeFormats.strikeThrough
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Strikethrough"
        >
          S
        </button>

        <div className="w-px h-5 bg-gray-300 mx-0.5" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => exec("justifyLeft")}
          className={`p-1.5 rounded text-xs cursor-pointer ${
            activeFormats.justifyLeft
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Align Left"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => exec("justifyCenter")}
          className={`p-1.5 rounded text-xs cursor-pointer ${
            activeFormats.justifyCenter
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Align Center"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm4 7h10v2H7v-2zm-4 7h18v2H3v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => exec("justifyRight")}
          className={`p-1.5 rounded text-xs cursor-pointer ${
            activeFormats.justifyRight
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Align Right"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => exec("justifyFull")}
          className={`p-1.5 rounded text-xs cursor-pointer ${
            activeFormats.justifyFull
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Justify"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z" />
          </svg>
        </button>

        <div className="w-px h-5 bg-gray-300 mx-0.5" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className={`p-1.5 rounded text-xs cursor-pointer ${
            activeFormats.insertUnorderedList
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Bullet List"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm5-10h12v2H9V6zm0 5h12v2H9v-2zm0 5h12v2H9v-2z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className={`p-1.5 rounded text-xs cursor-pointer ${
            activeFormats.insertOrderedList
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Numbered List"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm7-5h12v2H9V6zm0 5h12v2H9v-2zm0 5h12v2H9v-2z" />
          </svg>
        </button>

        <div className="w-px h-5 bg-gray-300 mx-0.5" />

        {/* Text Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-200 text-gray-700 cursor-pointer"
            title="Text Color"
          >
            <span className="font-bold border-b-2 border-red-500 pb-0.5">A</span>
            <span className="text-[10px]">▼</span>
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-50 flex gap-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    exec("foreColor", c);
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight Color Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-200 text-gray-700 cursor-pointer"
            title="Highlight Color"
          >
            <span className="bg-yellow-200 px-1 font-bold">H</span>
            <span className="text-[10px]">▼</span>
          </button>

          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-50 flex gap-1">
              {HIGHLIGHT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    exec("hiliteColor", c);
                    setShowHighlightPicker(false);
                  }}
                  className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center text-[9px]"
                  style={{ backgroundColor: c === "transparent" ? "#ffffff" : c }}
                  title={c}
                >
                  {c === "transparent" ? "✕" : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-300 mx-0.5" />

        {/* Horizontal Rule */}
        <button
          type="button"
          onClick={() => exec("insertHorizontalRule")}
          className="px-2 py-1 rounded text-xs hover:bg-gray-200 text-gray-700 cursor-pointer"
          title="Insert Horizontal Divider Line"
        >
          ― Line
        </button>

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => exec("removeFormat")}
          className="px-2 py-1 rounded text-xs hover:bg-red-50 text-red-600 cursor-pointer ml-auto"
          title="Clear Text Formatting"
        >
          Clear Style
        </button>
      </div>

      {/* Editor Content Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={triggerChange}
        onBlur={triggerChange}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="p-3 text-sm text-gray-800 focus:outline-hidden leading-relaxed whitespace-pre-wrap selection:bg-blue-100 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
      />
    </div>
  );
};

export default RichTextEditor;
