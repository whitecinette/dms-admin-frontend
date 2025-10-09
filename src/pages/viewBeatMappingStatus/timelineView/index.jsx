import React, { useEffect, useRef, useMemo } from "react";
import moment from "moment";
import { DataSet, Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./style.scss";

const TimelineView = ({ data = [], startDay, endDay, onDateChange }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  // 🔹 Prepare groups & items for visual timeline
  const { groups, items } = useMemo(() => {
    const groupsArr = [];
    const itemsArr = [];

    data.forEach((asm) => {
      groupsArr.push({
        id: asm.code,
        content: `<b>${asm.name}</b>`,
      });

      (asm.schedule || [])
        .filter((d) => d.status === "done")
        .forEach((dealer, i) => {
          const doneTime = dealer.markedDoneAt ? moment(dealer.markedDoneAt) : null;

          itemsArr.push({
            id: `${asm.code}-${i}`,
            group: asm.code,
            start: doneTime ? doneTime.toDate() : startDay,
            content: `
              <div style="
                font-size:10px;
                line-height:1.3;
                position:relative;
                padding:4px 6px;
                border-radius:6px;
                background:#00b894;
                color:#fff;
                text-align:center;
                min-width:70px;
                box-shadow:0 1px 3px rgba(0,0,0,0.15);
              ">
                <div style="
                  position:absolute;
                  top:-6px;
                  right:-6px;
                  width:16px;
                  height:16px;
                  border-radius:50%;
                  background:#fff;
                  color:#00b894;
                  font-weight:700;
                  font-size:9px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                ">
                  ${dealer.visited || 1}
                </div>
                <b>${dealer.name || "Unnamed Dealer"}</b><br/>
                <small>${dealer.code || "—"}</small><br/>
                <small>${dealer.taluka || "—"}</small><br/>
                <small>${doneTime ? doneTime.format("hh:mm A") : "—"}</small>
              </div>
            `,
            style: "border:none; background:none;",
          });
        });
    });

    return { groups: groupsArr, items: itemsArr };
  }, [data, startDay, endDay]);

  // 🔹 Timeline options
  const options = useMemo(
    () => ({
      stack: true,
      start: startDay,
      end: endDay,
      editable: false,
      zoomable: true,
      selectable: true,
      multiselect: false,
      margin: { item: 10, axis: 5 },
      orientation: "both",
      showCurrentTime: false,
      height: "100%",
      maxHeight: "600px",
      groupHeightMode: "fixed",
      groupMinHeight: 35,
    }),
    [startDay, endDay]
  );

  // 🔹 Initialize timeline safely
  useEffect(() => {
    if (!containerRef.current) return;

    if (timelineRef.current) {
      try {
        timelineRef.current.destroy();
      } catch (e) {
        console.warn("Timeline destroy skipped:", e);
      }
      timelineRef.current = null;
    }

    if (items.length === 0 || groups.length === 0) return;

    try {
      const timeline = new Timeline(
        containerRef.current,
        new DataSet(items),
        new DataSet(groups),
        options
      );
      timelineRef.current = timeline;
    } catch (e) {
      console.error("Timeline init failed:", e);
    }

    return () => {
      if (timelineRef.current) {
        try {
          timelineRef.current.destroy();
        } catch (e) {
          console.warn("Timeline cleanup skipped:", e);
        }
        timelineRef.current = null;
      }
    };
  }, [items, groups, options]);

  // 🔹 CSV Download Logic
  const handleDownloadCSV = () => {
    if (!data || data.length === 0) {
      alert("No data available to download!");
      return;
    }

    let csvRows = [];

    // Header
    csvRows.push([
      "ASM Code",
      "ASM Name",
      "Total",
      "Done",
      "Pending",
      "Dealer 1",
      "Dealer 2",
      "Dealer 3",
      "Dealer 4",
      "Dealer 5",
      "...",
    ].join(","));

    data.forEach((asm) => {
      const asmCode = asm.code || "N/A";
      const asmName = asm.name || "N/A";
      const total = asm.total ?? "";
      const done = asm.done ?? "";
      const pending = asm.pending ?? "";

      // Filter only 'done' dealers and sort by visit time
      const doneDealers = (asm.schedule || [])
        .filter((d) => d.status === "done")
        .sort((a, b) => {
          const timeA = a.markedDoneAt ? new Date(a.markedDoneAt).getTime() : 0;
          const timeB = b.markedDoneAt ? new Date(b.markedDoneAt).getTime() : 0;
          return timeA - timeB;
        });

      if (doneDealers.length === 0) return;

      // Each dealer detail formatted as "dealer name | dealer code | taluka | date time | visited"
      const dealerColumns = doneDealers.map((dealer) => {
        const doneTime = dealer.markedDoneAt
          ? moment(dealer.markedDoneAt).format("YYYY-MM-DD HH:mm:ss")
          : "";
        return `"${dealer.name || ""} | ${dealer.code || ""} | ${
          dealer.taluka || ""
        } | ${doneTime} | ${dealer.visited || 0}"`;
      });

      const row = [asmCode, asmName, total, done, pending, ...dealerColumns];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ASM_Timeline_${moment().format("YYYYMMDD_HHmmss")}.csv`;
    link.click();
  };

  // 🔹 JSX
  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <h2>Market Activity Timeline</h2>

        <div className="right-tools">
          <div className="date-range">
            <div className="date">
              <label>From:</label>
              <input
                type="date"
                value={startDay ? startDay.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const newStart = e.target.value ? new Date(e.target.value) : null;
                  onDateChange(newStart, endDay);
                }}
              />
            </div>
            <div className="date">
              <label>To:</label>
              <input
                type="date"
                value={endDay ? endDay.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  const newEnd = e.target.value ? new Date(e.target.value) : null;
                  onDateChange(startDay, newEnd);
                }}
              />
            </div>
          </div>

          <button className="download-btn" onClick={handleDownloadCSV}>
            Download CSV
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="no-data">No done dealers found for this range.</div>
      ) : (
        <div
          ref={containerRef}
          style={{
            height: "600px",
            borderRadius: "16px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        />
      )}
    </div>
  );
};

export default TimelineView;
