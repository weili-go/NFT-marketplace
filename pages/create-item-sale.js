import { useState } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
import web3 from 'web3'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')
import market from '../config/PICNFTMarket.json';
import nft from '../config/PICNFT.json';
const NETWORK_ID = 4;
const nftmarketaddress = market.networks[NETWORK_ID].address
const nftmarketabi = market.abi
const nftaddress = nft.networks[NETWORK_ID].address
const nftabi = nft.abi


export default function Home() {
  const [fileUrl, setFileUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [cid, setCid] = useState('')
  const [metacid, setMetacid] = useState('')
  const [formInput, updateFormInput] = useState({ name: '', description: '', salekind: '', price: '', reserved: '', duration:''})
  const router = useRouter()
  const [tx, setTx] = useState("")

  async function mintTokenWithurlAndSell(url) {
    const web3Modal = new Web3Modal({
      network: "rinkeby",
      cacheProvider: true,
    });
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)    
    const chainid = await provider.getNetwork()
    console.log(`chainid is ${chainid.chainId}`)
    if(chainid.chainId != 4){
      window.alert('Please change to Rinkeby network.')
      return
    }
    const signer = provider.getSigner()
    
    let nftcontract = new ethers.Contract(nftaddress,nftabi, signer)
    let transaction = await nftcontract.mintTokenAndApprove(url)
    setTx('mintTokenAndApprove')
    let tx = await transaction.wait()
    //console.log('waiting for create NFT ...');
    let event = tx.events[0]
    let value = event.args[2]
    let tokenId = value.toNumber()
    

    // sale
    const marketcontract = new ethers.Contract(nftmarketaddress, nftmarketabi, signer)
    //get 
    const listingPrice = await marketcontract.listingPrice()
    
    const price = web3.utils.toWei(formInput.price, 'ether')
    const reserved = formInput.salekind =='0' || !formInput.reserved ? web3.utils.toWei('0', 'ether'): web3.utils.toWei(formInput.reserved, 'ether')
    const duration = !formInput.duration ? '0': formInput.duration
    transaction = await marketcontract.sellNFTInMarket(nftaddress, tokenId, formInput.salekind,price,reserved,duration, { value: listingPrice })
    setTx('sellNFTInMarket')
    await transaction.wait()
    
    router.push('/')
  }

  async function onChange(e) {
    const file = e.target.files[0];
    try {

      setUploading(true)
      const added = await client.add(
        file,
        {
          progress: (prog) => console.log(`received: ${prog}`)
        }
      )
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      setUploading(false)
      setFileUrl(url)
      setCid(added.path)
    } catch (error) {
      //console.log('Error uploading file: ', error);
    }  
  }

  async function mintTokenAndSell() {
    const { name, description, salekind ,price, reserved, duration } = formInput
    if (!name || !description || !price || !fileUrl || !salekind || !duration) {
      window.alert('Please install NFT and Sale information.');
      return;
    }
    if (salekind == '0' && reserved) {
      window.alert('no need for reserved value for Fix sale kind.');
      return;
    }
    // upload to IPFS
    const data = JSON.stringify({
      name, description, image: fileUrl
    })
    try {
      const added = await client.add(data)
      setMetacid(added.path)
      const url = `https://ipfs.infura.io/ipfs/${added.path}`

      mintTokenWithurlAndSell(url)
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
          placeholder="NFT Sale Kind(0:Fix, 1:Auction)"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, salekind: e.target.value })}
        />
        <input
          placeholder="Price/Start Price (Eth)"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
        />
        <input
          placeholder="Auction Max Price"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, reserved: e.target.value })}
        />
        <input
          placeholder="Sale duration(minites)"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, duration: e.target.value })}
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
            <p className="text-1xl my-1 font-bold text-green-400">Uploaded metadata file to IPFS: {metacid}</p>
        }
        <button onClick={mintTokenAndSell} className="mt-4 bg-blue-500 text-white rounded p-1 shadow-lg">
          NFT作成と販売
        </button>
        {
          tx && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)
        }
      </div>
    </div>
  )
}
