import { useState } from "react";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import axios from "axios";
import "./App.css";
import abi from "./contractABI.json";
import { CONTRACT_ADDRESS } from "./contract";
import supabase from "./supabase";
<h1>BUILD TEST 12-JUN-2026</h1>


function App() {
  const [account, setAccount] = useState("");
  const [file, setFile] = useState(null);

  const [studentWallet, setStudentWallet] = useState("");
  const [ipfsCID, setIpfsCID] = useState("");

  const [issueStatus, setIssueStatus] = useState("");
  const [revokeStatus, setRevokeStatus] = useState("");
  const [generatedHash, setGeneratedHash] = useState("");

  const [certificate, setCertificate] = useState(null);
  const [ownershipStatus, setOwnershipStatus] = useState("");

  const [studentName, setStudentName] = useState("");

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);
    } catch (error) {
      console.error(error);
    }
  };

  const generateHash = async (selectedFile) => {
    const arrayBuffer = await selectedFile.arrayBuffer();

    const wordArray =
      CryptoJS.lib.WordArray.create(
        arrayBuffer
      );

    const hash =
      CryptoJS.SHA256(wordArray).toString();

    return "0x" + hash;
  };

  const uploadToIPFS = async () => {
    try {
      const formData = new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await axios.post(
  "https://credvault-backend-du5w.onrender.com/upload",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }
);

      return response.data.cid;

    } catch (error) {
      console.error(error);
      alert("IPFS Upload Failed");
      return null;
    }
  };

  const issueCredential = async () => {
    try {
      if (!file) {
        alert("Upload PDF");
        return;
      }

      if (!studentWallet) {
        alert("Enter student wallet");
        return;
      }

      const hash =
        await generateHash(file);

      setGeneratedHash(hash);

      setIssueStatus(
        "Uploading PDF to IPFS..."
      );

      const cid =
        await uploadToIPFS();

      if (!cid) return;

      setIpfsCID(cid);

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const contract =
        new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        signer
        );

      // Check if credential already exists
      

setIssueStatus(
"Waiting for MetaMask confirmation..."
);


      const tx =
        await contract.issueCredential(
          hash,
          studentWallet,
          cid,
          {
            gasLimit: 500000,
            maxPriorityFeePerGas:
              ethers.parseUnits(
                "30",
                "gwei"
              ),
            maxFeePerGas:
              ethers.parseUnits(
                "35",
                "gwei"
              ),
          }
        );

      setIssueStatus(
        "Transaction submitted..."
      );

      await tx.wait();
      const { error } = await supabase
  .from("credentials")
  .insert([
    {
      student_wallet: studentWallet,
      credential_hash: hash,
      ipfs_cid: cid,
      tx_hash: tx.hash,
      student_name: studentName,
      status: "active",
    },
  ]);

if (error) {
  console.log("Supabase Error:", error);
}

      setIssueStatus(
        "Credential Issued Successfully ✅"
      );

    } catch (error) {
      console.error(error);
      setIssueStatus(
        error.message
      );
    }
  };

  const revokeCredential = async () => {
  try {
    if (!file) {
      alert("Upload certificate PDF");
      return;
    }

    const hash =
      await generateHash(file);

    const provider =
      new ethers.BrowserProvider(
        window.ethereum
      );

    const signer =
      await provider.getSigner();

    const contract =
      new ethers.Contract(
        CONTRACT_ADDRESS,
        abi,
        signer
      );

    const existingCredential =
      await contract.verifyCredential(
        hash
      );

    if (!existingCredential[0]) {
      setRevokeStatus(
        "Certificate does not exist ❌"
      );
      return;
    }

    if (existingCredential[1]) {
      setRevokeStatus(
        "Certificate already revoked ❌"
      );
      return;
    }

    setRevokeStatus(
      "Waiting for MetaMask confirmation..."
    );

    const tx =
      await contract.revokeCredential(
        hash,
        {
          gasLimit: 300000,
          maxPriorityFeePerGas:
            ethers.parseUnits(
              "30",
              "gwei"
            ),
          maxFeePerGas:
            ethers.parseUnits(
              "35",
              "gwei"
            ),
        }
      );

    setRevokeStatus(
      "Transaction submitted..."
    );

    await tx.wait();
    await supabase
        .from("credentials")
        .update({
        status: "revoked",
        })
        .eq(
          "credential_hash",
          hash
        );

    setRevokeStatus(
      "Credential Revoked ✅"
    );

  } catch (error) {
    console.error(error);

    setRevokeStatus(
      error.reason ||
      error.message
    );
  }
};
  const verifyCertificate = async () => {
    try {
      if (!file) {
        alert(
          "Upload certificate PDF"
        );
        return;
      }

      const hash =
        await generateHash(file);

      setGeneratedHash(hash);

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const contract =
        new ethers.Contract(
          CONTRACT_ADDRESS,
          abi,
          provider
        );

      const result =
        await contract.verifyCredential(
          hash
        );

      setCertificate({
        exists: result[0],
        revoked: result[1],
        studentWallet: result[2],
        ipfsCID: result[3],
        issuedAt: new Date(
          Number(result[4]) * 1000
        ).toLocaleString(),
      });

      setOwnershipStatus("");

    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const verifyOwnership = async () => {
    try {
      if (!certificate) {
        alert(
          "Verify certificate first"
        );
        return;
      }

      if (!certificate.exists) {
        alert(
          "Certificate not found"
        );
        return;
      }

      const challenge =
        `Verify ownership at ${Date.now()}`;

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const signature =
        await signer.signMessage(
          challenge
        );

      const recoveredAddress =
        ethers.verifyMessage(
          challenge,
          signature
        );

      if (
        recoveredAddress.toLowerCase() ===
        certificate.studentWallet.toLowerCase()
      ) {
        setOwnershipStatus(
          "Owner Verified ✅"
        );
      } else {
        setOwnershipStatus(
          "Owner Not Verified ❌"
        );
      }

    } catch (error) {
      console.error(error);

      if (
        error.code ===
        "ACTION_REJECTED"
      ) {
        setOwnershipStatus(
          "Signature Rejected ❌"
        );
      }
    }
  };

  return (
  <div className="app">

    <div className="hero-section">
      <h2 className="title">
        Blockchain Credential Vault
      </h2>

      <button
        className="primary-btn"
        onClick={connectWallet}
      >
        Connect MetaMask
      </button>

      <div className="wallet-card">
        {account
          ? account
          : "Wallet Not Connected"}
      </div>
    </div>

    <div className="glass">

      <h2>University Portal</h2>


      <input
        type="text"
        placeholder="Student Name"
        value={studentName}
        onChange={(e) =>
        setStudentName(e.target.value)
      }
      />

      <input
        type="text"
        placeholder="Student Wallet Address"
        value={studentWallet}
        onChange={(e) =>
          setStudentWallet(
            e.target.value
          )
        }
      />

      <input
        type="file"
        accept=".pdf"
        onChange={(e) =>
          setFile(
            e.target.files[0]
          )
        }
      />

      <div
  style={{
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  }}
>
  <button
    onClick={issueCredential}
  >
    Issue Credential
  </button>

  <button
    onClick={revokeCredential}
  >
    Revoke Credential
  </button>
</div>

<p>{issueStatus}</p>

<p>{revokeStatus}</p>

      {generatedHash && (
  <>
    <h4>Generated Hash</h4>

    <p
      style={{
        wordBreak:
          "break-all",
      }}
    >
      {generatedHash}
    </p>

  </>
)}

      {ipfsCID && (
  <>
    <h4>IPFS CID</h4>

    <p>{ipfsCID}</p>

    <a
      href={`https://gateway.pinata.cloud/ipfs/${ipfsCID}`}
      target="_blank"
      rel="noreferrer"
    >
      View Certificate
    </a>

  </>
)}

    </div>

    <div className="glass">

      <h2>Verifier Portal</h2>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) =>
          setFile(
            e.target.files[0]
          )
        }
      />

      <button
        onClick={
          verifyCertificate
        }
      >
        Verify Certificate
      </button>

      {certificate && (
        <div className="result-card">

          <h3>
            Certificate Details
          </h3>

          <p>
            <strong>Exists:</strong>{" "}
            {certificate.exists
              ? "✅"
              : "❌"}
          </p>

          <p>
            <strong>Revoked:</strong>{" "}
            {certificate.revoked
              ? "❌"
              : "✅"}
          </p>

          <p>
            <strong>
              Student Wallet:
            </strong>{" "}
            {
              certificate.studentWallet
            }
          </p>

          <p>
            <strong>
              IPFS CID:
            </strong>{" "}
            {
              certificate.ipfsCID
            }
          </p>

          <p>
            <strong>
              Issued At:
            </strong>{" "}
            {
              certificate.issuedAt
            }
          </p>

          <button
            onClick={
              verifyOwnership
            }
          >
            Verify Ownership
          </button>

          <h3>
            {ownershipStatus}
          </h3>

          <a
            href={`https://gateway.pinata.cloud/ipfs/${certificate.ipfsCID}`}
            target="_blank"
            rel="noreferrer"
          >
            View Certificate
          </a>

        </div>
      )}

    </div>

  </div>
);
}

export default App;