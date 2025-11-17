# 矩阵验收详情页表单痛点说明（结合代码视角）

> 本文只描述痛点与复杂性来源，不讨论如何优化或重构。  
> 所有小节都会结合当前代码（用简化伪代码和文件路径）说明“问题具体长什么样”。

---

## 一、字段间关联导致的显隐 / 清空 / 回填 —— 依赖关系隐式、跨层级

### 1.1 驱动字段很多，但“谁影响谁”只能从 handler 里推

在这个模块中，几个关键字段会驱动其他大量字段变化，但这种关系没有集中描述，只能靠阅读 handler 代码一点点推：

- 驱动字段一：`receiptUserCode`（验收人）  
  相关代码：`components/BasicInfo/index.tsx`

  ```ts
  // 验收人变更逻辑（简化伪代码）
  const handleChangeReceiptUser = async (userCode: string) => {
    const country = await APIGetOptionsUserCountry({ userCode })
    if (!country) return

    // 1. 驱动验收组织
    const org = createOrgOptions.find(i => i.country === country)
    if (org) {
      const currentCountry =
        appOrgList.find(i => i.value === form.getValues('applicationOrgId'))?.country || ''
      form.setValue('applicationOrgId', org.value)
      handleOrgCountryChange(currentCountry, country)
    }

    // 2. 驱动采购主体 & 费用结算主体
    const entity = createOrgIdOptions.find(i => i.country === country)
    if (entity) {
      form.setValue('purchaseOrgId', entity.value)
      form.setValue('paymentOrgId', entity.value)
      handlePaymentOrgChange(entity.value)
    }
  }
  ```

  读这段代码时，才能意识到：

  - 改“验收人”会顺带改“验收组织 / 采购主体 / 结算主体”；
  - 还会连带触发 `handleOrgCountryChange` 和 `handlePaymentOrgChange`，最终波及矩阵明细。

- 驱动字段二：`applicationOrgId`（验收组织）  
  相关代码：`components/BasicInfo/index.tsx`

  ```ts
  // 验收组织变更 => 若国家变了，清空矩阵中的部分字段
  const handleOrgCountryChange = (prevCountry: string, val: string) => {
    const country = appOrgList.find(i => i.value === val)?.country || ''
    if (prevCountry === country) return

    const matrixData = form.getValues('batchReceiptDetailDTOList') || []
    matrixData.forEach((item, index) => {
      ;(['stationCode', 'deptId', 'feeType', 'feeBearingItemCode'] as const).forEach((key) => {
        if (item[key]) {
          form.setValue(`batchReceiptDetailDTOList.${index}.${key}`, '')
        }
      })
    })
  }
  ```

  只有深入这个 handler，才能知道“验收组织本质上是通过国家去间接控制矩阵中的网点 / 部门 / 费用字段”。

- 驱动字段三：`paymentOrgId`（费用结算主体）  
  相关代码：`components/BasicInfo/index.tsx`

  ```ts
  // 结算主体变更 => BRA 时批量补税号
  const handlePaymentOrgChange = async (val: string) => {
    if (val !== Payment_Org_Id.BRA) return

    const list = form.getValues('batchReceiptDetailDTOList') || []
    list
      .filter(i => !i.supplierCnpjCpf && i.supplierCode)
      .map(async (item, index) => {
        const taxNo = await APIGetSupplierTaxNo({ supplierCode: item.supplierCode, orgId: val })
        if (!taxNo) return
        form.setValue(`batchReceiptDetailDTOList.${index}.supplierCnpjCpf`, taxNo)
      })
  }
  ```

  这里表面上是“改一个头信息字段”，实际改动的是明细矩阵里所有行的 `supplierCnpjCpf`。这种跨层级影响在表单 schema 上几乎看不出来，只能从 handler 中发现。

**痛点点位：**

- 依赖关系完全“长在 handler 上”，不看代码就不知道“谁影响谁”；
- 想回答“改验收人会影响哪些字段？”必须串读多个函数，没法从一处配置或表结构看出；
- 对新同学来说，很难建立起完整的心智模型。

### 1.2 一个业务动作，会在多个文件/函数里拆成几段执行

以“修改验收人”为例，真实执行链路从代码角度看，大致是：

```ts
// BasicInfo: change receiptUserCode
handleChangeReceiptUser(userCode)
  -> APIGetOptionsUserCountry(userCode)        // 查国家
  -> set applicationOrgId + handleOrgCountryChange
  -> set purchaseOrgId / paymentOrgId + handlePaymentOrgChange

// BasicInfo: handleOrgCountryChange
handleOrgCountryChange(prevCountry, country)
  -> 遍历 batchReceiptDetailDTOList，清空 stationCode/deptId/feeType/feeBearingItemCode

// BasicInfo: handlePaymentOrgChange
handlePaymentOrgChange(paymentOrgId)
  -> 如果是 BRA，遍历 batchReceiptDetailDTOList
     调 APIGetSupplierTaxNo 补 supplierCnpjCpf
```

这些逻辑分布在：

- `components/BasicInfo/index.tsx` 的多个 handler；
- service 中的接口调用；
- 矩阵表格依赖的 form 字段。

对于维护者来说：

- “验收人变更”不是一个可以在代码里明显看到的单元，而是三个函数 + 两个接口 + 一组明细字段操作拼出来的；
- 想在文档里画出这条链（从改验收人，到影响明细的哪些字段），只能靠人工读代码并总结。

### 1.3 清空 / 回填逻辑的“影响面”靠猜，缺少显式边界

清空逻辑在代码中是一段具体操作，但“为什么是这几个字段、还有没有别的字段会受影响”没有集中说明。

示例（同样来自 `handleOrgCountryChange`）：

```ts
// 组织国家变化时，清空明细矩阵中的部分字段
const matrixData = form.getValues('batchReceiptDetailDTOList') || []
matrixData.forEach((item, index) => {
  ;(['stationCode', 'deptId', 'feeType', 'feeBearingItemCode'] as const).forEach((key) => {
    if (item[key]) {
      form.setValue(`batchReceiptDetailDTOList.${index}.${key}`, '')
    }
  })
})
```

**难点：**

- 只能从这几行代码“推测”出：国家变了，所以网点/部门/费用相关字段要清空；
- 如果后来矩阵里新增了一个也和国家有关的字段（比如 `someCountryRelatedField`），开发者需要自己想起要在这里加一项，否则就会漏清；
- 改动清空策略时，没有一个地方能告诉你“全部受影响字段列表”，只靠 grep 和经验。

### 1.4 明细层面的批量操作，入口在头表，容易漏感知

`paymentOrgId` 变更的 handler 中，直接操作的是矩阵行的 bank/tax 字段：

```ts
// apps/pms/src/pages/IOI/MatrixAcceptanceManagementDetail/components/BasicInfo/index.tsx
const handlePaymentOrgChange = async (val: string) => {
  if (val !== Payment_Org_Id.BRA) return
  const list = form.getValues('batchReceiptDetailDTOList') || []

  list
    .filter(i => !i.supplierCnpjCpf && i.supplierCode)
    .map(async (item, index) => {
      const taxNo = await APIGetSupplierTaxNo({ supplierCode: item.supplierCode, orgId: val })
      if (!taxNo) return
      form.setValue(`batchReceiptDetailDTOList.${index}.supplierCnpjCpf`, taxNo)
    })
}
```

**痛点：**

- 在 MatrixTable 的代码中，看不到这段逻辑，很容易误以为“矩阵行只会在表格内部被修改”；
- 在 BasicInfo 中，看上去只是改一个“表头字段”，但实际上会在明细上做大量隐式修改；
- 如果有别的地方也在改 `supplierCnpjCpf`，冲突和覆盖关系很难一眼看清。

---

## 二、不同值驱动校验规则变化 —— 规则分散、多层叠加，整体规则难以把握

### 2.1 发票字段的“必填 + 唯一性”规则被拆散在多个层次

发票相关字段（`invoiceNo`、`invoiceSerial`、`chaveKey`）的规则逻辑由以下几部分决定：

1. 当前 `paymentOrgId` 是否属于“需要发票号必填”的主体；
2. 当前 `paymentOrgId` 是否属于“需要做发票三要素唯一性校验”的主体；
3. 明细行本身是否填写了这几个字段。

对应代码分布：

- **配置获取层**：`hooks/useShouldCheckUniqueInvoice.tsx`

  ```ts
  export const useShouldCheckUniqueInvoice = () => {
    const { APIGetOptionsValue } = useInstance(MatrixAcceptanceManagementDetailService)

    return useMutation({
      mutationFn: async () => {
        const data = await APIGetOptionsValue(['invoicePaymentOrgIdList'])
        if (!data) return []
        return data.invoicePaymentOrgIdList || []
      },
    })
  }
  ```

  这段代码决定了“哪些 paymentOrgId 需要做发票组合唯一性校验”，但信息只存在于这个 hook 内部。

- **提交校验层**：`components/Footer.tsx` 中的 `handleCheckUniqueInvoiceCombo`

  ```ts
  const { mutateAsync: shouldCheckUniqueInvoice } = useShouldCheckUniqueInvoice()

  const handleCheckUniqueInvoiceCombo = async (
    values: MatrixAcceptanceManagementDetailForm,
  ): Promise<boolean> => {
    const shouldCheckOrgIdList = await shouldCheckUniqueInvoice()

    // 若当前主体不在配置列表内，直接跳过后续校验
    if (!shouldCheckOrgIdList.includes(values.paymentOrgId)) return true

    const list = values.batchReceiptDetailDTOList
    const map: Record<string, number> = {}
    let result = true

    for (let idx = 0; idx < list.length; idx++) {
      const { invoiceNo, invoiceSerial, chaveKey } = list[idx]
      if (!invoiceNo || !invoiceSerial || !chaveKey) continue

      const combo = `${invoiceNo}-${invoiceSerial}-${chaveKey}`
      if (map[combo] === undefined) {
        map[combo] = idx
        continue
      }

      form.setError(`batchReceiptDetailDTOList.${idx}.invoiceNo`, {
        type: 'custom',
        message: t('发票号发票序列号发票key不能重复tips'),
      })
      result = false
    }
    return result
  }
  ```

- **字段必填层**：发票号是否必填由另一个 hook (`useInvoiceNoRequired`) 和各个 Cell 内部逻辑决定（在 MatrixTable 的 `InvoiceCells` 中使用）。

**整体痛点：**

- “发票号到底什么时候必填、什么时候要保证组合唯一”这个问题，需要阅读至少 3 个文件（hook + Footer + 单元格组件）才能拼出完整答案；
- 规则依赖一个动态配置列表 `invoicePaymentOrgIdList`，但这个列表只在 hook 内被提到，其他代码看不到其存在；
- 对外很难给出一句简短的规则描述，比如：“当付款主体属于配置 X 时，发票三要素必须唯一”，因为 X 只在接口返回中存在。

### 2.2 单字段规则 vs 组合规则 vs 单据级规则混杂在一起

当前模块的校验存在多个层次：

- 字段级（Form.Item 规则）：
  - `remarks`：必填 + 长度限制；
  - `businessOccurrenceTimeRange`：起止时间必须同时有值；
  - `dueDate`：不能小于今天（在日期控件的 `disabledDate` 中实现）。

  示例（`components/BasicInfo/index.tsx`）：

  ```ts
  <Form.Item
    label={t('业务发生时间')}
    name="businessOccurrenceTimeRange"
    rules={{
      validate: {
        required: (_, values) => {
          const { businessOccurrenceTimeStart, businessOccurrenceTimeEnd } = values
          return Boolean(businessOccurrenceTimeStart && businessOccurrenceTimeEnd) || t('必填')
        },
      },
    }}
  >
    <StyledRangePickerInform ... />
  </Form.Item>
  ```

- 组合级（写在 Footer 中的自定义校验）：
  - 合同号 + 采购编码组合唯一（`handleCheckContractCodeAndItemCodeCombo`）；
  - 发票三要素组合唯一（`handleCheckUniqueInvoiceCombo`）。

  示例（`components/Footer.tsx`）：

  ```ts
  const handleCheckContractCodeAndItemCodeCombo = async (values) => {
    const list = values.batchReceiptDetailDTOList
    const map: Record<string, number> = {}
    let result = true

    for (let idx = 0; idx < list.length; idx++) {
      const { contractCode, purchaseItemCode } = list[idx]
      if (!contractCode || !purchaseItemCode) continue
      const combo = `${contractCode}-${purchaseItemCode}`

      if (map[combo] === undefined) {
        map[combo] = idx
        continue
      }

      form.setError(`batchReceiptDetailDTOList.${idx}.purchaseItemCode`, {
        type: 'custom',
        message: t('合同号采购编码不能重复tips'),
      })
      result = false
    }
    return result
  }
  ```

- 单据级（只在提交时整体考虑）：
  - 在 `handleSubmit` 中，先跑 `form.trigger()` 做字段级校验，再跑两个组合校验函数，最后才决定是否提交。

**痛点：**

- 不同层级规则的边界不清晰：哪些应该算字段级、哪些算组合级，代码上没有明显界线；
- 若要整理出“这张单提交前一共有哪几条规则”，只能通过阅读 Footer 和各个 Form.Item 逐一归纳；
- 一旦业务改动某个规则，需要确认它是否在多个层次都被实现过（防止改漏或出现重复规则）。

### 2.3 规则与配置强绑定，但“配置 → 行为”的映射散在多处

以决定是否做“发票组合唯一性校验”的配置为例：

- 配置的获取：

  ```ts
  // useShouldCheckUniqueInvoice.tsx
  const data = await APIGetOptionsValue(['invoicePaymentOrgIdList'])
  return data?.invoicePaymentOrgIdList || []
  ```

- 配置的使用：

  ```ts
  // Footer.tsx
  const shouldCheckOrgIdList = await shouldCheckUniqueInvoice()
  if (!shouldCheckOrgIdList.includes(values.paymentOrgId)) return true

  // 否则才进入组合唯一性校验逻辑
  ```

**痛点：**

- “什么情况下要校验发票唯一性”这一规则的真正定义，被拆成了“接口里的一段配置 + Footer 里的一句包含判断”；
- 阅读 Footer 时，只能看到 `shouldCheckOrgIdList` 这个变量名，看不到这个列表是从哪里来的、含义是什么；
-> 要完全理解规则，必须跑到 hook 再对照接口文档，理解 `invoicePaymentOrgIdList` 的语义，成本高。

---

## 三、动态下拉选项依赖多维环境 —— 环境条件零散、选项来源多头

### 3.1 同一个“国家/主体”维度，在不同地方被反复推导和使用

本模块里，国家（country）、组织（org）、主体（orgId）、品类（categoryCodeList）等维度贯穿了几乎所有下拉选项：

- `BasicInfo` 中：

  ```ts
  // 验收组织、主体选项
  const { data: createOrgOptions = [] } = useCreatedOrgList()
  const { data: createOrgIdOptions = [] } = useCreateOrgIdList({ withCountry: true })

  // 根据结构生成带国家信息的验收组织列表
  const appOrgList = useMemo(() => {
    return createOrgOptions.flatMap(({ label, value, children, country }) => {
      return children?.length
        ? children.map(twoDept => ({
            label: `${label}-${twoDept.label}`,
            value: twoDept.value,
            country: twoDept.country,
          }))
        : { label, value, country }
    })
  }, [createOrgOptions])
  ```

- `MatrixTable` 中：

  ```ts
  // 当前国家（来源于某个 hook，内部又利用 applicationOrgId 或其他字段）
  const currentCountry = useCurrentCountry()

  // 费用相关下拉都依赖 currentCountry
  const { data: expenseItemOptions = [] } = useExpenseItemOptions(currentCountry)
  const { data: expenseDeptOptions = [] } = useExpenseDeptOptions(currentCountry)
  const { data: expenseStationOptions = [] } = useExpenseStationOptions(currentCountry)
  ```

**痛点：**

- “国家”这个维度既从用户所属国家（验收人）、又从组织列表、又从 hook 中被多次推导；
- 每个选项 hook 只知道自己接到的参数（比如 `currentCountry`），但很难在阅读时立刻知道这个参数是从哪来的；
- 如果将来国家计算逻辑（比如从“验收组织国家”改为“付款主体国家”）有变化，需要在多个地方搜索和替换，很容易漏。

### 3.2 选项来源散落在多处文件，难以形成“选项来源地图”

不同选项的来源代码示例：

- 付款方式选项：`BasicInfo` 中临时 `useQuery`

  ```ts
  const { data: settlementMethodOptions = [] } = useQuery({
    queryKey: ['settlementMethodOptions'],
    queryFn: () => request('/purchase/manager/py/getPyPaymentMethodInfoByType', {...}),
    select: (data) =>
      data?.settlementMethodList?.map(item => ({ label: item.name, value: item.code })) || [],
  })
  ```

- 允许品类 & 供应商列表：`MatrixTable/index.tsx`

  ```ts
  const { data: subCategoryCodeOptions = [] } = useMatrixAcceptanceAllowCategories()
  const subCategoryCodeList = useMemo(
    () => subCategoryCodeOptions.map(i => i.value),
    [subCategoryCodeOptions],
  )

  const { data: supplierList = [] } = useQuery({
    queryKey: ['supplerMasterList', subCategoryCodeList],
    queryFn: () =>
      APIGetSupplierMasterList({
        params: { isPage: '0', resolveName: '1', isFilterBlack: '1' },
        data: {
          categoryCodeList: subCategoryCodeList,
          statusCodeList: [SDS_SUPPLIER_STATUS.CertifiedSuccess, SDS_SUPPLIER_STATUS.ActiveCooperation],
        },
      }),
    select: (data) =>
      data?.results?.map(i => ({
        value: i.supplierCode,
        label: i.supplierName,
        country: i.country || '',
        unifiedSocialCreditCode: i.unifiedSocialCreditCode || '',
        categoryCodeList: i.categoryCodeList || [],
      })) || [],
  })
  ```

- 费用项目 / 部门 / 网点选项：`MatrixTable` 下多个 hook。

**痛点：**

- 想回答“供应商下拉的过滤逻辑是啥？”时，需要看：
  - 允许品类 hook；
  - 供应商列表的 useQuery；
  - SDS_SUPPLIER_STATUS 枚举；
  - 以及可能的权限过滤（如 `isFilterBlack`）；
- 想回答“费用部门下拉跟哪个字段有关？”时，需要看：
  - `useExpenseDeptOptions` 的参数；
  - `useCurrentCountry` 的实现；
  - 以及 BasicInfo 中国家/组织的来源；
- 这些信息横跨多文件、多层抽象，缺少“一眼能看懂的选项来源总图”。

### 3.3 选项刷新与字段变更的关系不清晰

由于选项获取逻辑分散在多个 hook 和组件里，每个 hook 自己决定“何时重新请求 / 依赖哪些字段”：

- 某些选项跟 `currentCountry` 绑定，只要这个值变就会重新拉；
- 某些选项跟 `subCategoryCodeList` 绑定；
- 某些选项仅在组件初次渲染时请求一次。

**痛点：**

- 当用户反馈“改了某个字段后，下拉选项没更新/更新过度”时，很难直接定位到哪个 hook 的依赖写得不对；
- 有可能出现“表头环境已经变化，但部分选项 hook 还在用旧的环境条件”的情况，而这种不一致只能在运行时暴露；
- 在文档上很难给出：某个字段变化 → 哪些下拉会重新刷新，这类清晰的说明。

---

## 四、整体验证和维护角度的隐性痛点

在上述三大类问题叠加后，会产生一些更隐蔽但实际影响很大的痛点：

1. **可测试性弱**  
   - 字段联动（如验收人 → 组织/主体 → 明细）、动态规则（如发票唯一性）、选项过滤（按国家/品类）的逻辑都分散在多个 handler / hook / 组件中，缺少一个“纯业务函数”可以直接针对它写单测；  
   - 验证某一具体业务规则（例如“在 BRA 主体下，补税号行为是否正确”）往往只能通过 UI 流程手动操作，而不是针对清晰的函数接口。

2. **行为描述难**  
   - 向产品/业务描述“修改验收人会发生什么”时，需要口头解释一串效果（组织变、主体变、明细清空、税号补全），很难用一张简单表格覆盖；  
   - 合同选择、导入、撤销提交等行为都同时涉及主表、明细、附件和审批状态，很难从代码中提取出一段简洁、完整的行为描述。

3. **改动的影响面难以评估**  
   - 新增一个字段的联动（比如再加一个与国家相关的字段）时，很难确定所有需要调整的清空/回填/校验/选项逻辑；  
   - 修改某个维度（例如国家的判定规则）时，需要在多个 hook 和组件里同步修改，容易漏改，导致行为不一致。

4. **新成员上手门槛高**  
   - 新人需要先通过阅读代码“猜测”字段间关系，再自己画依赖图验证；  
   - 缺少一份以代码为基础、专门讲“复杂点和坑点”的文档，上手时需要大量口头传递经验。

本文件的目的，就是基于当前实现，用尽量贴近代码的方式把这些痛点点清楚，为后续任何形式的设计讨论提供一个共同的“问题底稿”。  

