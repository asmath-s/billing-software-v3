import { useState } from "react";
import Button from "../Button/Button";
import DeleteButton from "../DeleteButton/DeleteButton";
import { ClearIcon, WarningIcon } from "../icons";

const DeletePopup = ({
  handleDelete,
  disabled,
  message = "Are you sure you want to delete this note?",
}) => {
  const [PopupOpen, setPopupOpen] = useState(false);

  return (
    <div>
      <DeleteButton
        onClick={() => {
          setPopupOpen(true);
        }}
        disabled={disabled}
      />

      {PopupOpen && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-[999]"
          onClick={() => setPopupOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-lg w-96 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-medium flex items-center gap-2">
                <WarningIcon /> Confirmation
              </h1>
              <ClearIcon
                onClick={() => setPopupOpen(false)}
                className="cursor-pointer"
              />
            </div>

            <div className="my-4">
              <p>{message}</p>
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <Button
                label="Delete"
                className="w-full hover:bg-rose-600 border-rose-600 text-rose-600"
                onClick={() => {
                  handleDelete();
                  setPopupOpen(false);
                }}
              />
              <Button
                label="Cancel"
                onClick={() => setPopupOpen(false)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletePopup;
