import { useState } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
//import web3 from 'web3'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')
import nft from '../config/PICNFT.json';
const NETWORK_ID = 4;
//const nftmarketaddress = market.networks[NETWORK_ID].address
//const nftmarketabi = market.abi
const nftaddress = nft.networks[NETWORK_ID].address
const nftabi = nft.abi


export default function Home() {
  const [tx, setTx] = useState("")
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState(null)
  const [cid, setCid] = useState('')
  const [metacid, setMetacid] = useState('')
  const [formInput, updateFormInput] = useState({ property: '', name: '', description: '' })
  const router = useRouter()

  async function mintNFTWithURL(url) {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const signer = provider.getSigner()
    
    let contract = new ethers.Contract(nftaddress,nftabi, signer)
    let transaction = await contract.mintToken(url)
    setTx('mintToken')
    let tx = await transaction.wait()
    let event = tx.events[0]
    let value = event.args[2]
    let tokenId = value.toNumber()
    //console.log(`tokenId is ${tokenId}`)
    
    
    //return to home
    router.push('/my-all-nfts')
  }
  async function onChange(e) {
    setUploading(true)
    const file = e.target.files[0];
    try {
      const added = await client.add(
        file,
        {
          progress: (prog) => console.log(`received: ${prog}`)
        }
      )
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      setFileUrl(url)
      setUploading(false)
      setCid(added.path)
    } catch (error) {
      //console.log('Error uploading file: ', error);
      setUploading(false)
    }  
  }

  async function mintNFT() {
    const { name, description, property } = formInput
    if (!name || !description || !property || !fileUrl) {
      window.alert('Please install NFT information.');
      return;
    }
    // upload to IPFS
    const data = JSON.stringify({
      name, description, property,image: fileUrl
    })
    try {
      const added = await client.add(data)
      setMetacid(added.path)
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      mintNFTWithURL(url)
    } catch (error) {
      //console.log('Error uploading file: ', error);
    }  
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input 
          placeholder="NFT Name"
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
        />
        <input
          placeholder="NFT Description"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
        />
        <input
          placeholder="NFT Property"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, property: e.target.value })}
        />
        <input
          type="file"
          name="NFT"
          className="my-4"
          onChange={onChange}
        />
        {
          fileUrl && (
            <img className="rounded mt-4" width="350" src={fileUrl} />
          )
        }
        {
          uploading &&
            <p className="text-1xl my-1 font-bold text-yellow-400">Uploading the content to IPFS ...</p>
        }
        {
          fileUrl &&
            <p className="text-1xl my-1 font-bold text-green-400">Uploaded the content to IPFS: {cid}</p>
        }
        {
          metacid &&
            <p className="text-1xl my-1 font-bold text-green-400">Uploaded the metadata file to IPFS: {metacid}</p>
        }
        <button onClick={mintNFT} className="mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
          NFT作成
        </button>
        {
          tx && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)
        }
      </div>
    </div>
  )
}
