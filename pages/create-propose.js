import { useState } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'
//import web3 from 'web3'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')
import dao from '../config/PICGovernorDAO.json';
import market from '../config/PICNFTMarket.json';
import timelock from '../config/PICTimeLock.json';
import daotoken from '../config/DAOToken.json';

const NETWORK_ID = 4;
//const nftmarketaddress = market.networks[NETWORK_ID].address
//const nftmarketabi = market.abi
const daoaddress = dao.networks[NETWORK_ID].address
const daoabi = dao.abi

const daotokenaddress = daotoken.networks[NETWORK_ID].address
const daotokenabi = daotoken.abi

const mkaddress = market.networks[NETWORK_ID].address
const mkabi = market.abi

const tladdress = timelock.networks[NETWORK_ID].address
const tlabi = timelock.abi

var address2iface = new Map();
address2iface.set(daoaddress.toLowerCase(),daoabi)
address2iface.set(mkaddress.toLowerCase(),mkabi)
address2iface.set(tladdress.toLowerCase(),tlabi)
address2iface.set(daotokenaddress.toLowerCase(),daotokenabi)


export default function Home() {
  const [tx, setTx] = useState("")
  const [uploading, setUploading] = useState(false)
  const [fileUrl, setFileUrl] = useState(null)
  const [cid, setCid] = useState('')
  const [fm, setFm] = useState({})
  const [formInput, updateFormInput] = useState({ calldatas: '', description: ''})
  const router = useRouter()

  console.log('--------')
  console.log(router.query)
  console.log('--------')
  //setFm({address:router.query.address, func:router.query.func})
  //updateFormInput({targets:, calldatas:router.query.func})

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
      updateFormInput({ ...formInput, description: formInput.description + ' \n ' + url })
      setCid(added.path)
    } catch (error) {
      //console.log('Error uploading file: ', error);
      setUploading(false)
    }  
  }

  async function propose() {
    const { description, calldatas } = formInput
    const targets = router.query.address
    //
    if (!calldatas || !description) {
      window.alert('Please install detail proposal information, so other stakeholders can follow.');
      return;
    }

    try {
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
      
      let contract = new ethers.Contract(daoaddress,daoabi, signer)

      const targets_p = [targets]
      const funcs = [calldatas]
      console.log(funcs)

      // func(p1,p2,p3)
      const calldatas_p = await Promise.all(funcs.map(async (v,index) => { 

        const func = v.split('(')[0];
        const paras = v.split('(')[1].split(')')[0].split(',');
        
        const targetaddress = targets_p[index].toLowerCase();
        console.log('------------')
        console.log(targetaddress)
        console.log(address2iface)
        console.log('------------')

        if(!address2iface.get(targetaddress)){
          throw "no such function"
        }
        let iface = new ethers.utils.Interface(address2iface.get(targetaddress));
        console.log({func,paras})

        const calldata = iface.encodeFunctionData(func,paras)

        console.log(calldata);
        return calldata

      }))

      console.log('-------')
      console.log(calldatas_p)

      const value_p = new Array(targets_p.length).fill(0);
      let transaction = await contract.propose(targets_p,value_p,calldatas_p,description)

      setTx('propose')
      let tx = await transaction.wait()
      
      //return to home
      router.push('/proposes')
    } catch (error) {
      //console.log('Error uploading file: ', error);
    }
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <p className="text-1xl my-1 font-bold">target contract : {router.query.name}</p>
        <input
          disabled
          placeholder={router.query.address}
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, targets: e.target.value })}
        />
        <p className="text-1xl my-1 font-bold">function format : {router.query.func}</p>
        <input
          placeholder={router.query.func}
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, calldatas: e.target.value })}
        />
        <p className="text-1xl my-1 font-bold">description : </p>
        <input
          placeholder="description"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
        />
        <p className="text-1xl my-1 font-bold">description file: </p>
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
            <p className="text-1xl my-1 font-bold text-yellow-400">Uploading the description file to IPFS ...</p>
        }
        {
          fileUrl &&
            <p className="text-1xl my-1 font-bold text-green-400">Uploaded the description file to IPFS. CID: {cid}</p>
        }
        <button onClick={propose} className="mt-4 bg-blue-500 text-white rounded p-4 shadow-lg">
          提案する
        </button>
        {
          tx && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)
        }
      </div>
    </div>
  )
}
