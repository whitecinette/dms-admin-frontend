import React, { useEffect, useState } from "react";
import { FaPlus, FaEdit } from "react-icons/fa";
import axios from "axios";
import config from "../../config";
import "./style.scss";
import AddTypeGroupModal from "../../components/groupsComponents/addTypeGroupModal"; // <-- Import your component

const backendUrl = config.backend_url;

const dummyData = [
    {
        type_name: "Sales Flow A",
        firm_name: "Siddha Corporation",
        usercodes: ["12345", "12346", "12347"],
        flow_name: "default_sales_flow",
        other_config: {
            allowGeoTracking: true,
            dailyTarget: 10000,
        },
    },
    {
        type_name: "Ops Flow B",
        firm_name: "Oorja Marketing",
        usercodes: ["22345", "22346"],
        flow_name: "jockey_flow",
        other_config: {
            shiftBased: true,
        },
    },
];

const dummyUsers = [
    {
        _id: "67bdaaec45d9bb04a38329c3",
        name: "Jain Mobile",
        code: "RAJD002111",
        status: "active",
        role: "dealer",
        isVerified: true,
        city: "jaipur",
        district: "Kota",
        owner_details: {
            name: "John Doe",
            phone: "9876543210",
        },
        credit_limit: 60000,
    },
    {
        _id: "67bdab3dbe7657eb1d8e8e8e",
        name: "Indian Mobile Telecom",
        code: "RAJD017276",
        city: "Unknown",
        taluka: "Itawa",
        zone: "Kota"
    }
];

const TypeGroupConfig = () => {
    const [typeGroups, setTypeGroups] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);

    const getTypeGroups = async () => {
        try {
            const res = await axios.get(`${backendUrl}/admin/type-configs`, {
                headers: { Authorization: localStorage.getItem("authToken") },
            });
            setTypeGroups(res.data.data); // Real data
        } catch (err) {
            console.error("Using dummy data due to error:", err);
            setTypeGroups(dummyData); // fallback
        }
    };

    useEffect(() => {
        getTypeGroups();
    }, []);

    return (
        <div className="type-group-config-page">
            <div className="header-row">
                <h2>Type Group Configurations</h2>
                <button onClick={() => setShowAddModal(true)} className="primary-btn">
                    <FaPlus style={{ marginRight: 6 }} />
                    Add Type Group
                </button>
            </div>

            <div className="type-group-grid">
                {typeGroups.map((group, index) => (
                    <div className="type-group-card" key={index}>
                        <div className="type-title">{group.type_name}</div>
                        <div className="firm">Firm: {group.firm_name}</div>
                        <div className="flow">Flow: {group.flow_name}</div>
                        <div className="users">Users: {group.usercodes.join(", ")}</div>
                        <div className="other">
                            Other Config:
                            <pre>{JSON.stringify(group.other_config, null, 2)}</pre>
                        </div>
                        <div className="edit-btn">
                            <FaEdit style={{ cursor: "pointer" }} />
                        </div>
                    </div>
                ))}
            </div>

            {showAddModal && (
                <AddTypeGroupModal
                    closeModal={() => setShowAddModal(false)}
                    flows={["default_sales_flow", "jockey_flow"]}
                    dummyUsers={dummyUsers}
                    onSuccess={getTypeGroups}
                />
            )}
        </div>
    );
};

export default TypeGroupConfig;
