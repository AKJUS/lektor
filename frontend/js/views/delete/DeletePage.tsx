import React, { useCallback, useEffect, useState } from "react";
import { useRecord } from "../../context/record-context";
import { getParentPath } from "../../utils";
import { get, post } from "../../fetch";
import { showErrorDialog } from "../../error-dialog";
import { RecordInfo } from "../../components/types";
import DeletableAttachments from "./DeletableAttachments";
import DeletableChildPages from "./DeletableChildPages";
import DeletableAlternatives from "./DeletableAlternatives";
import DeletePageActions from "./DeletePageActions";
import DeleteAllAltsChoice from "./DeleteAllAltsChoice";
import DeletePageHeader from "./DeletePageHeader";
import { dispatch } from "../../events";
import { useGoToAdminPage } from "../../components/use-go-to-admin-page";

function DeletePage(): React.JSX.Element | null {
  const { path, alt } = useRecord();

  const [recordInfo, setRecordInfo] = useState<RecordInfo | null>(null);
  const [deleteMasterRecord, setDeleteMasterRecord] = useState(true);

  const goToAdminPage = useGoToAdminPage();

  useEffect(() => {
    let ignore = false;

    get("/recordinfo", { path }).then((resp) => {
      if (!ignore) {
        setRecordInfo(resp);
      }
    }, showErrorDialog);

    return () => {
      ignore = true;
    };
  }, [path]);

  useEffect(() => {
    setDeleteMasterRecord(alt === "_primary");
  }, [alt]);

  const deleteRecord = useCallback(() => {
    const parent = getParentPath(path);
    const targetPath = parent === null ? "/" : parent;

    post("/deleterecord", {
      path,
      alt,
      delete_master: deleteMasterRecord ? "1" : "0",
    }).then(() => {
      if (recordInfo?.is_attachment) {
        dispatch("lektor-attachments-changed", parent ?? "");
      }
      goToAdminPage("edit", targetPath, alt);
    }, showErrorDialog);
  }, [alt, path, deleteMasterRecord, goToAdminPage, recordInfo]);

  const cancelDelete = useCallback(() => {
    goToAdminPage("edit", path, alt);
  }, [goToAdminPage, path, alt]);

  if (!recordInfo || !recordInfo.can_be_deleted) {
    return null;
  }

  const hasAlts = recordInfo.alts.filter((a) => a.exists).length > 1;

  return (
    <div>
      <DeletePageHeader recordInfo={recordInfo} currentAlt={alt} />
      {hasAlts && alt === "_primary" && (
        <DeleteAllAltsChoice
          deleteMasterRecord={deleteMasterRecord}
          setDeleteMasterRecord={setDeleteMasterRecord}
          isAttachment={recordInfo.is_attachment}
        />
      )}
      {deleteMasterRecord && (
        <>
          {hasAlts && alt === "_primary" && (
            <DeletableAlternatives recordInfo={recordInfo} />
          )}
          {recordInfo.children.length > 0 && (
            <DeletableChildPages recordInfo={recordInfo} />
          )}
          {recordInfo.attachments.length > 0 && (
            <DeletableAttachments recordInfo={recordInfo} />
          )}
        </>
      )}
      <DeletePageActions
        deleteRecord={deleteRecord}
        cancelDelete={cancelDelete}
      />
    </div>
  );
}

export default DeletePage;
