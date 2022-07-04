import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import web3 from 'web3'
import axios from 'axios'
import Web3Modal from "web3modal"
import dao from '../config/PICGovernorDAO.json';
import nft from '../config/PICNFT.json';
import daotoken from '../config/DAOToken.json';
import { useRouter } from 'next/router'
const NETWORK_ID = 4;

const daotokenaddress = daotoken.networks[NETWORK_ID].address
const daotokenabi = daotoken.abi

export default function Home() {
  const [holders, setHolders] = useState([])
  const [loaded, setLoaded] = useState('not-loaded')
  const [curAcount, setCurAcount] = useState('')
  const [totalsupply, setTotalsupply] = useState('0')
  const [formInput, updateFormInput] = useState({delegator: ''})
  const [tx, setTx] = useState("")
  const [isok, setIsok] = useState(false)
  const router = useRouter()

  useEffect(() => {
    window.ethereum.on("accountsChanged", (accounts) => {
      //console.log(`acount changed => ${accounts}`)
      if(router.asPath == '/dao-tokens'){
        loadNFTs()
      }
    })
    loadNFTs()
  }, [])

  async function go(propose, type) {
    const { delegator } = formInput
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
    const daotokenContract = new ethers.Contract(daotokenaddress, daotokenabi, signer)
  
    let transaction
    
    if(type == 'delegate'){
      if(!delegator){
        window.alert('Please install delegator address.');
        return;
      }
      transaction = await daotokenContract.delegate(delegator)
    } 

    setTx(type)
    await transaction.wait()
    loadNFTs()
  }

  async function loadNFTs() {
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
    const cur = await signer.getAddress();
    setCurAcount(cur)
    setTx(null)

    const daotokenContract = new ethers.Contract(daotokenaddress, daotokenabi, signer)

    console.log(`${daotokenContract.address}`);
    const totalsupply = await daotokenContract.totalSupply();
    setTotalsupply(totalsupply.toString())

    //const blockn = await provider.getBlockNumber()
    //console.log(blockn)

    //const pastvotepower = await daotokenContract.getPastTotalSupply(blockn-1)
    //console.log(pastvotepower.toString())


    let eventFilter = daotokenContract.filters.Transfer()
    let events = await daotokenContract.queryFilter(eventFilter, 10884314, "latest")
    console.log(events)

    const pastHolders = [cur];

    const blance = await daotokenContract.balanceOf(cur);
    const votespower = await daotokenContract.getVotes(cur);
    const delegator = await daotokenContract.delegates(cur);

    let holdercur = {
      holder: cur,
      balance: blance.toString(),
      votespower: votespower.toString(),
      delegator:delegator,
    }

    const holdersnocur = await Promise.all(events.map(async i => {

      if (pastHolders.indexOf(i.args.to) == -1){
        pastHolders.push(i.args.to)


        const blance = await daotokenContract.balanceOf(i.args.to);
        const votespower = await daotokenContract.getVotes(i.args.to);
        const delegator = await daotokenContract.delegates(i.args.to);

        let holder = {
          holder: i.args.to,
          balance: blance.toString(),
          votespower: votespower.toString(),
          delegator:delegator,
        }

        return holder
      }

    }))

    console.log(holdersnocur)
    const hnonull = holdersnocur.filter(i => !!i)
    console.log(hnonull)
    setHolders([holdercur, ...hnonull])
    setLoaded('loaded')
  }

  if (loaded === 'loaded' && !holders.length) return (<h1 className="p-20 text-4xl">No holders!</h1>)

  return (
    <div >
    <p className="text-1xl my-1 font-bold flex justify-center text-green-400">DAO Token address: {daotokenaddress}</p>
    <p className="text-1xl my-1 font-bold flex justify-center text-green-400">DAO Token total supply: {totalsupply}</p>
    <p className="text-1xl my-1 font-bold flex justify-center text-black-400">Holders are as below: </p>
    <div className="flex justify-center">
      <div style={{ width: 900 }}>
        <div className="grid grid-cols-1 gap-4 pt-8">
          {
            holders.map((holder, i) => (
              <div key={i} className="border p-4 shadow">
                {i==0 ? <p className="text-1xl my-1 font-bold text-yellow-400">Current Account: {holder.holder}</p> : <p className="text-1xl my-1 font-bold">Holder: {holder.holder}</p>}
                <p className="text-1xl my-1 font-bold">Balance: {holder.balance}</p>
                <p className="text-1xl my-1 font-bold">Vote Power: {holder.votespower}</p>
                <p className="text-1xl my-1 font-bold">Delegator: {holder.delegator}</p>
                {
                  (holder.balance !== '0' && holder.holder.toLowerCase() == curAcount.toLowerCase()) &&
                  <div className="border p-4"> 
                    <input
                    size='30'
                    placeholder="the account delegate you to vote"
                    className="mt-1 border rounded p-4"
                    onChange={e => updateFormInput({ ...formInput, delegator: e.target.value })}
                    />
                    <button className="bg-green-600 text-white py-2 px-12 rounded" onClick={() => go(holder, 'delegate')}>Delegate</button>
                    {tx && (<p className="font-bold text-yellow-400 ">🌈 Sending '{tx}' Transaction to Ethereum ... 🌕 🌕 🌓 🌑 🌑 </p>)}
                  </div>
                }
              </div>

            ))
          }
        </div>
      </div>
    </div>
    </div>
  )
}
