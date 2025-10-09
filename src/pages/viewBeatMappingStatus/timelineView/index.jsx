import React, { useEffect, useRef, useMemo, useState } from "react";
import moment from "moment";
import { DataSet, Timeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./style.scss";

const TimelineView = ({ data = [], startDay: parentStart, endDay: parentEnd, onDateChange }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  // ✅ local state to keep the inputs reactive
  const [startDay, setStartDay] = useState(parentStart || moment().startOf("month").toDate());
  const [endDay, setEndDay] = useState(parentEnd || moment().endOf("month").toDate());

  // if parent updates (like resetting), sync local state
  useEffect(() => {
    if (parentStart) setStartDay(parentStart);
    if (parentEnd) setEndDay(parentEnd);
  }, [parentStart, parentEnd]);

  const handleDateChange = (newStart, newEnd) => {
    // auto-fix invalid ranges
    let fixedStart = newStart;
    let fixedEnd = newEnd;
    if (fixedStart && fixedEnd && fixedStart > fixedEnd) {
      fixedEnd = fixedStart;
    }

    setStartDay(fixedStart);
    setEndDay(fixedEnd);

    if (typeof onDateChange === "function") {
      onDateChange(fixedStart, fixedEnd);
    }
  };

  // 🔹 Prepare timeline data
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
      } catch {}
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
        } catch {}
        timelineRef.current = null;
      }
    };
  }, [items, groups, options]);

  // 🔹 CSV Download
  const handleDownloadCSV = () => {
    if (!data || data.length === 0) {
      alert("No data available to download!");
      return;
    }
    const csvRows = [];
    csvRows.push(["ASM Code", "ASM Name", "Total", "Done", "Pending"].join(","));
    data.forEach((asm) => {
      const row = [
        asm.code || "N/A",
        asm.name || "N/A",
        asm.total ?? "",
        asm.done ?? "",
        asm.pending ?? "",
      ].join(",");
      csvRows.push(row);
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ASM_Timeline_${moment().format("YYYYMMDD_HHmmss")}.csv`;
    link.click();
  };

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
                value={moment(startDay).format("YYYY-MM-DD")}
                max={moment(endDay).format("YYYY-MM-DD")}
                onChange={(e) => handleDateChange(new Date(e.target.value), endDay)}
              />
            </div>
            <div className="date">
              <label>To:</label>
              <input
                type="date"
                value={moment(endDay).format("YYYY-MM-DD")}
                min={moment(startDay).format("YYYY-MM-DD")}
                onChange={(e) => handleDateChange(startDay, new Date(e.target.value))}
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
